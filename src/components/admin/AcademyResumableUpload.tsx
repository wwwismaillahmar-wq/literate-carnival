'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Intent = { assetId: string; objectPath: string; bucket: string; mimeType: string; maxBytes: number };
type UploadState = 'idle'|'uploading'|'paused'|'done'|'error';
const CHUNK = 6 * 1024 * 1024;
const encoder = (value: string) => btoa(Array.from(new TextEncoder().encode(value), b => String.fromCharCode(b)).join(''));
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** Direct TUS 1.0 uploader: no file bytes pass through Next.js/Vercel. */
export function AcademyResumableUpload({lessonId}:{lessonId:string}) {
  const [file,setFile] = useState<File|null>(null);
  const [state,setState] = useState<UploadState>('idle');
  const [percent,setPercent] = useState(0);
  const [message,setMessage] = useState('');
  const pause = useRef(false);
  const running = useRef(false);
  const controller = useRef<AbortController|null>(null);
  const storage = createClient();
  const endpoint = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/,'') + '/storage/v1/upload/resumable';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const resumeKey = (f:File) => 'aslan:tus:' + lessonId + ':' + f.name + ':' + f.size + ':' + f.lastModified;

  useEffect(() => () => { pause.current = true; controller.current?.abort(); }, []);

  async function headers() {
    const {data:{session}} = await storage.auth.getSession();
    if (!session?.access_token) throw new Error('انتهت جلسة الدخول؛ سجّل الدخول مجددًا.');
    return {authorization:'Bearer ' + session.access_token,apikey:key,'Tus-Resumable':'1.0.0'};
  }

  async function request(url:string,method:string,extra:Record<string,string>={},body?:Blob) {
    const response = await fetch(url,{method,headers:{...await headers(),...extra},body,
      signal:(controller.current = new AbortController()).signal});
    if (!response.ok) throw new Error('فشل نقل الملف ('+response.status+'): '+(await response.text()).slice(0,160));
    return response;
  }

  async function run() {
    if (!file || !lessonId || running.current) return;
    running.current = true; pause.current = false; setState('uploading'); setMessage('');
    const keyName = resumeKey(file);
    try {
      if (!endpoint.startsWith('https://') || !key) throw new Error('إعدادات التخزين غير مكتملة.');
      let record: {url:string;assetId:string}|null = null;
      try { const raw = localStorage.getItem(keyName); if(raw) record = JSON.parse(raw); } catch {}
      let offset = 0;
      if (record) {
        try {
          if (new URL(record.url).origin !== new URL(endpoint).origin) throw new Error('Invalid TUS origin');
          const head = await request(record.url,'HEAD');
          offset = Number(head.headers.get('Upload-Offset'));
          if (!Number.isSafeInteger(offset) || offset < 0 || offset > file.size) throw new Error('Invalid offset');
        } catch (err) {
          if (pause.current) throw err;
          throw new Error('تعذر التحقق من جلسة الرفع السابقة؛ احتفظ بالملف وحاول لاحقًا دون إنشاء نسخة مكررة.');
        }
      }
      if (!record) {
        const intentResponse = await fetch('/api/academy/upload-intent',{method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({lessonId,fileName:file.name,sizeBytes:file.size})});
        const intent = await intentResponse.json() as Intent & {error?:string};
        if (!intentResponse.ok) throw new Error(intent.error || 'تعذر إنشاء طلب الرفع.');
        const metadata = [
          ['bucketName',intent.bucket],['objectName',intent.objectPath],
          ['contentType',intent.mimeType],['cacheControl','3600']
        ].map(([name,value])=>name+' '+encoder(value)).join(',');
        const created = await request(endpoint,'POST',{
          'Upload-Length':String(file.size),'Upload-Metadata':metadata,
          'x-upsert':'false'
        });
        const location = created.headers.get('Location');
        if (!location) throw new Error('لم يرجع التخزين عنوان متابعة الرفع.');
        const url = new URL(location,endpoint).toString();
        if (new URL(url).origin !== new URL(endpoint).origin) throw new Error('عنوان متابعة غير آمن.');
        record = {url,assetId:intent.assetId};
        localStorage.setItem(keyName,JSON.stringify(record));
      }
      while (offset < file.size) {
        if (pause.current) { setState('paused'); return; }
        let attempts = 0;
        while (true) {
          try {
            const chunk = file.slice(offset,Math.min(offset+CHUNK,file.size));
            const response = await request(record.url,'PATCH',{
              'Upload-Offset':String(offset),
              'Content-Type':'application/offset+octet-stream',
            },chunk);
            const next = Number(response.headers.get('Upload-Offset'));
            if (!Number.isSafeInteger(next) || next <= offset || next > file.size)
              throw new Error('استجابة تقدم غير صالحة من الخادم.');
            offset = next; setPercent(Math.round(offset/file.size*100)); break;
          } catch (err) {
            if (pause.current) { setState('paused'); return; }
            if (++attempts >= 5) throw err;
            await wait(Math.min(1000*2**attempts,16000));
            const head = await request(record.url,'HEAD');
            const serverOffset = Number(head.headers.get('Upload-Offset'));
            if (!Number.isSafeInteger(serverOffset) || serverOffset < 0 || serverOffset > file.size)
              throw new Error('تعذر استعادة موضع الرفع.');
            offset = serverOffset;
          }
        }
      }
      const confirmed = await fetch('/api/academy/upload-complete',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({assetId:record.assetId})});
      const result = await confirmed.json() as {error?:string};
      if (!confirmed.ok) throw new Error(result.error || 'فشل تأكيد اكتمال الملف.');
      localStorage.removeItem(keyName);
      setState('done'); setMessage('اكتمل نقل الملف، وينتظر مراجعة الإدارة قبل النشر.');
    } catch (err) {
      if (pause.current) setState('paused');
      else {setState('error');setMessage(err instanceof Error?err.message:'فشل غير معروف.');}
    } finally {running.current=false;}
  }

  return <section className="card" style={{display:'grid',gap:8}}>
    <h4>رفع ملف الدرس (قابل للاستئناف)</h4>
    <input type="file" disabled={state==='uploading'} onChange={event=>{
      setFile(event.target.files?.[0]??null);setPercent(0);setState('idle');setMessage('');
    }}/>
    <progress max={100} value={percent} style={{width:'100%'}} aria-label="نسبة رفع الملف"/>
    <p>{percent}% · {state==='uploading'?'جارٍ الرفع':state==='paused'?'متوقف مؤقتًا':state==='done'?'اكتمل':'جاهز'}</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <button type="button" disabled={!file || state==='uploading'||state==='done'} onClick={()=>void run()}>
        {state==='paused'||state==='error'?'استئناف الرفع':'بدء الرفع'}
      </button>
      <button type="button" disabled={state!=='uploading'} onClick={()=>{pause.current=true;controller.current?.abort();}}>إيقاف مؤقت</button>
    </div>
    {message && <p role="status">{message}</p>}
    <small>يُحفظ موضع الرفع في هذا المتصفح. عند انقطاع الاتصال اختر الملف نفسه لاستئنافه. الحد الفعلي يتبع إعدادات المخزن.</small>
  </section>;
}
