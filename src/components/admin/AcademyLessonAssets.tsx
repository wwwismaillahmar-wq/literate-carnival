'use client';
import {useCallback,useEffect,useState} from 'react';

type Asset={id:string;file_name:string;file_size:number;status:string;storage_backend?:string};
const statusLabels:Record<string,string>={ready:'جاهز',pending:'قيد الرفع',uploaded:'بانتظار مراجعة الإدارة',rejected:'مرفوض',archived:'مؤرشف'};
async function json<T>(response:Response):Promise<T>{const data=await response.json();if(!response.ok)throw new Error(data.error||'تعذر تنفيذ العملية.');return data as T;}

/** Asset list and lifecycle only; all new transfers use AcademyResumableUpload. */
export function AcademyLessonAssets({lessonId,refreshKey=0}:{lessonId:string;refreshKey?:number}){
 const [assets,setAssets]=useState<Asset[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const data=await json<{assets:Asset[]}>(await fetch('/api/academy/assets?lessonId='+lessonId,{cache:'no-store'}));setAssets(data.assets);},[lessonId]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'تعذر تحميل الملفات.'));},[load,refreshKey]);
 async function change(assetId:string,remove:boolean){
 if(busy)return;setBusy(true);setError('');setNotice('');
 try{
 await json(await fetch('/api/academy/assets'+(remove?'?assetId='+assetId:''),{method:remove?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},...(remove?{}:{body:JSON.stringify({assetId})})}));
 await load();setNotice(remove?'تم حذف المحتوى وأرشفة الملف.':'تم تثبيت الملف.');
 }catch(e){setError(e instanceof Error?e.message:'تعذر تنفيذ العملية.');}finally{setBusy(false);}
 }
 return <section style={{marginTop:16}}><h4>ملفات الدرس</h4>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!assets.length&&<p className="muted">ارفع ملف الدرس من حقل الرفع القابل للاستئناف أدناه.</p>}
 <ul>{assets.map(asset=><li key={asset.id} style={{marginTop:8}}>
 {asset.file_name} · {asset.file_size>=1073741824?(asset.file_size/1073741824).toFixed(2)+' GiB':(asset.file_size/1048576).toFixed(2)+' MiB'} · {statusLabels[asset.status]??asset.status}
 {asset.status==='ready'&&<> · <a href={'/api/academy/resources?assetId='+asset.id} target="_blank" rel="noreferrer">فتح الملف</a></>}
 {asset.status==='pending'&&asset.storage_backend!=='contabo'&&<button disabled={busy} onClick={()=>void change(asset.id,false)}>إعادة تثبيت الرفع القديم</button>}
 <button disabled={busy} onClick={()=>void change(asset.id,true)}>{asset.status==='archived'?'إعادة محاولة حذف المحتوى':'حذف الملف'}</button>
 </li>)}</ul></section>;
}
