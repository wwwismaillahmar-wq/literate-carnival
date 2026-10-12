'use client';
import {useCallback,useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
import {academyAssetTypes,academyAssetLimit} from '@/lib/academy/requests';
type Asset={id:string;file_name:string;file_size:number;status:string};
async function json<T>(response:Response):Promise<T>{const data=await response.json();if(!response.ok)throw new Error(data.error||'تعذر تنفيذ العملية.');return data as T;}
export function AcademyLessonAssets({lessonId}:{lessonId:string}){
 const [assets,setAssets]=useState<Asset[]>([]),[file,setFile]=useState<File|null>(null),[inputKey,setInputKey]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const data=await json<{assets:Asset[]}>(await fetch('/api/academy/assets?lessonId='+lessonId,{cache:'no-store'}));setAssets(data.assets);},[lessonId]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'تعذر تحميل الملفات.'));},[load]);
 async function upload(event:React.FormEvent<HTMLFormElement>){
 event.preventDefault();if(!file||busy)return;
 if(!academyAssetTypes.has(file.type)||file.size<1||file.size>academyAssetLimit){setError('اختر ملفًا مسموحًا لا يتجاوز 50MB.');return;}
 setBusy(true);setError('');setNotice('');let assetId='',uploaded=false;
 try{
 const prepared=await json<{assetId:string;bucket:string;path:string;token:string}>(await fetch('/api/academy/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId,fileName:file.name,mimeType:file.type,fileSize:file.size})}));
 assetId=prepared.assetId;
 const result=await createClient().storage.from(prepared.bucket).uploadToSignedUrl(prepared.path,prepared.token,file,{contentType:file.type});
 if(result.error)throw new Error('تعذر رفع الملف. أعد المحاولة.');
 uploaded=true;
 await json(await fetch('/api/academy/assets',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({assetId})}));
 setFile(null);setInputKey(x=>x+1);setNotice('تم رفع الملف وتثبيت جاهزيته.');
 }catch(e){
 if(assetId&&!uploaded)await fetch('/api/academy/assets?assetId='+assetId,{method:'DELETE'}).catch(()=>{});
 setError(e instanceof Error?e.message:'تعذر رفع الملف.');
 }finally{await load().catch(()=>{});setBusy(false);}
 }
 async function change(assetId:string,remove:boolean){
 if(busy)return;setBusy(true);setError('');setNotice('');
 try{
 await json(await fetch('/api/academy/assets'+(remove?'?assetId='+assetId:''),{method:remove?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},...(remove?{}:{body:JSON.stringify({assetId})})}));
 await load();setNotice(remove?'تم حذف المحتوى وأرشفة الملف.':'تم تثبيت الملف.');
 }catch(e){setError(e instanceof Error?e.message:'تعذر تنفيذ العملية.');}finally{setBusy(false);}
 }
 return <section style={{marginTop:16}}><h4>ملفات الدرس</h4>
 <p className="muted">فيديو MP4/WebM، PDF، PowerPoint، Word، صور أو نص. الحد الأقصى 50MB لكل ملف.</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <form onSubmit={upload} style={{display:'grid',gap:8}}>
 <label>اختر الملف<input key={inputKey} type="file" accept=".mp4,.webm,.pdf,.pptx,.docx,.jpg,.jpeg,.png,.webp,.txt" disabled={busy} onChange={e=>setFile(e.target.files?.[0]??null)}/></label>
 <button disabled={busy||!file}>{busy?'جارٍ الرفع...':'رفع الملف'}</button></form>
 <ul>{assets.map(asset=><li key={asset.id} style={{marginTop:8}}>
 {asset.file_name} · {(asset.file_size/1048576).toFixed(2)} MB · {asset.status==='ready'?'جاهز':asset.status==='pending'?'بانتظار تثبيت الرفع':'مؤرشف'}
 {asset.status==='ready'&&<> · <a href={'/api/academy/resources?assetId='+asset.id} target="_blank" rel="noreferrer">معاينة</a></>}
 {asset.status==='pending'&&<button disabled={busy} onClick={()=>void change(asset.id,false)}>إعادة تثبيت الرفع</button>}
 <button disabled={busy} onClick={()=>void change(asset.id,true)}>{asset.status==='archived'?'إعادة محاولة حذف المحتوى':'حذف الملف'}</button>
 </li>)}</ul></section>;
}
