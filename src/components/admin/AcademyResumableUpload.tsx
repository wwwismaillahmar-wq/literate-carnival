'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { parseTusOffset, recoverTusOffset } from '@/lib/uploads/tus-response';

type Intent = { assetId: string; objectPath: string; endpoint: string; backend: 'contabo'; mimeType: string; maxBytes: number };
type UploadState = 'idle'|'uploading'|'paused'|'done'|'error';
const CHUNK = 6 * 1024 * 1024;
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/** TUS directly to ASLAN's Contabo disk. No file bytes pass through Next.js/Vercel. */
export function AcademyResumableUpload({lessonId,onComplete}:{lessonId:string;onComplete?:()=>void}) {
  const [file,setFile] = useState<File|null>(null);
  const [state,setState] = useState<UploadState>('idle');
  const [percent,setPercent] = useState(0);
  const [message,setMessage] = useState('');
  const pause = useRef(false);
  const running = useRef(false);
  const controller = useRef<AbortController|null>(null);
  const storage = createClient();
  const resumeKey = (f:File, userId: string) => 'aslan:contabo-tus:' + userId + ':' + lessonId + ':' + f.name + ':' + f.size + ':' + f.lastModified;

  useEffect(() => () => { pause.current = true; controller.current?.abort(); }, []);

  async function headers() {
    const {data:{session}} = await storage.auth.getSession();
    if (!session?.access_token) throw new Error('انتهت جلسة الدخول؛ سجّل الدخول مجددًا.');
    return {authorization:'Bearer ' + session.access_token,'Tus-Resumable':'1.0.0'};
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
    try {
      const configResponse = await fetch('/api/academy/upload-intent', { cache: 'no-store' });
      const config = await configResponse.json() as { baseUrl?: string; maxBytes?: number };
      if (!configResponse.ok || !config.baseUrl?.startsWith('https://')) throw new Error('بوابة رفع الخادم غير متاحة.');
      if (!config.maxBytes || file.size > config.maxBytes) throw new Error('يتجاوز حجم الملف الحد المسموح: 8 GiB.');
      const endpoint = new URL(config.baseUrl).origin;
      const { data: { session } } = await storage.auth.getSession();
      if (!session) throw new Error('سجّل الدخول أولًا.');
      const keyName = resumeKey(file, session.user.id);
      let record: {url:string;assetId:string}|null = null;
      try { const raw = localStorage.getItem(keyName); if(raw) record = JSON.parse(raw); } catch {}
      let offset = 0;
      if (record) {
        try {
          if (record.url !== endpoint + '/files/' + record.assetId) throw new Error('Invalid TUS URL');
          offset = await recoverTusOffset(record.url,file.size,0,url=>request(url,'HEAD'));
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
        if (intent.endpoint !== endpoint + '/files/' + intent.assetId) throw new Error('عنوان بوابة غير صالح.');
        const created = await request(intent.endpoint,'POST',{
          'Upload-Length':String(file.size),
        });
        const location = created.headers.get('Location');
        if (!location) throw new Error('لم يرجع التخزين عنوان متابعة الرفع.');
        const url = new URL(location,endpoint).toString();
        if (url !== intent.endpoint) throw new Error('عنوان متابعة غير آمن.');
        record = {url,assetId:intent.assetId};
        localStorage.setItem(keyName,JSON.stringify(record));
      }
      while (offset < file.size) {
        if (pause.current) { setState('paused'); return; }
        let attempts = 0;
        let recoverOffset = false;
        while (true) {
          try {
            if (recoverOffset) {
              offset = await recoverTusOffset(record.url,file.size,offset,url=>request(url,'HEAD'),
                Math.min(offset+CHUNK,file.size));
              if (offset === file.size) break;
              recoverOffset = false;
            }
            const chunk = file.slice(offset,Math.min(offset+CHUNK,file.size));
            const response = await request(record.url,'PATCH',{
              'Upload-Offset':String(offset),
              'Content-Type':'application/offset+octet-stream',
            },chunk);
            const next = parseTusOffset(response.headers,file.size);
            if (next <= offset || next > offset + chunk.size)
              throw new Error('استجابة تقدم غير صالحة من الخادم.');
            offset = next; setPercent(Math.round(offset/file.size*100)); break;
          } catch (err) {
            if (pause.current) { setState('paused'); return; }
            if (++attempts >= 5) throw err;
            recoverOffset = true;
            await wait(Math.min(1000*2**attempts,16000));
          }
        }
      }
      const confirmed = await fetch('/api/academy/upload-complete',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({assetId:record.assetId})});
      const result = await confirmed.json() as {error?:string};
      if (!confirmed.ok) throw new Error(result.error || 'فشل تأكيد اكتمال الملف.');
      localStorage.removeItem(keyName);
      setState('done'); setMessage('اكتمل نقل الملف، وينتظر مراجعة الإدارة قبل النشر.');
      onComplete?.();
    } catch (err) {
      if (pause.current) setState('paused');
      else {setState('error');setMessage(err instanceof Error?err.message:'فشل غير معروف.');}
    } finally {running.current=false;}
  }

  return <section className="card" style={{display:'grid',gap:8}}>
    <h4>رفع ملف الدرس حتى 8 GiB (قابل للاستئناف)</h4>
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
