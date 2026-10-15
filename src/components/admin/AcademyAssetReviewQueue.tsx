'use client';

import { useEffect, useState } from 'react';

type Asset = {id:string;lesson_id:string;file_name:string;mime_type:string;file_size:number;status:string;created_at:string};

export function AcademyAssetReviewQueue() {
  const [assets,setAssets] = useState<Asset[]>([]);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  async function load() {
    const response = await fetch('/api/academy/assets-review',{cache:'no-store'});
    const data = await response.json() as {assets?:Asset[];error?:string};
    if (!response.ok) throw new Error(data.error||'تعذر تحميل الملفات.');
    setAssets(data.assets??[]);
  }
  useEffect(()=>{void load().catch(err=>setMessage(err instanceof Error?err.message:'تعذر التحميل.'));},[]);
  async function reject(id:string) {
    if (!window.confirm('رفض هذا الملف؟ لن يظهر للطلاب.')) return;
    setBusy(true);setMessage('');
    try {
      const response = await fetch('/api/academy/assets-review',{
        method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({assetId:id,decision:'reject'})
      });
      const result = await response.json() as {error?:string};
      if (!response.ok) throw new Error(result.error||'تعذر رفض الملف.');
      await load();setMessage('تم رفض الملف.');
    } catch(err) {setMessage(err instanceof Error?err.message:'تعذر إتمام المراجعة.');}
    finally {setBusy(false);}
  }
  return <section className="card">
    <h2>مراجعة ملفات الأكاديمية</h2>
    <p className="muted">اعتماد الملفات غير مفعّل حتى يكتمل فحص المحتوى والأمان. يمكن للإدارة مراجعة قائمة الملفات ورفض غير المناسب منها.</p>
    <button type="button" disabled={busy} onClick={()=>void load().catch(err=>setMessage(String(err)))}>تحديث القائمة</button>
    {message&&<p role="status">{message}</p>}
    {!assets.length&&<p>لا توجد ملفات قيد المراجعة.</p>}
    {assets.map(asset=><article key={asset.id} style={{borderTop:'1px solid #888',padding:'12px 0'}}>
      <strong>{asset.file_name}</strong>
      <p>{asset.status} · {(asset.file_size/1024/1024).toFixed(1)} MiB · {asset.mime_type}</p>
      <small>الدرس: {asset.lesson_id}</small>
      {asset.status==='uploaded'&&<div><button type="button" disabled={busy} onClick={()=>void reject(asset.id)}>رفض الملف</button></div>}
    </article>)}
  </section>;
}
