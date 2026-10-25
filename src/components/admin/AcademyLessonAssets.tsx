'use client';
import {useCallback,useEffect,useState} from 'react';
import {useAslanLanguage} from '@/components/AslanLocale';
import {academyAssetCopy} from '@/lib/i18n/academy-assets';

type Asset={id:string;file_name:string;file_size:number;status:string;storage_backend?:string};
async function json<T>(response:Response,fallback:string,showServerError:boolean):Promise<T>{const data=await response.json();if(!response.ok)throw new Error((showServerError&&data.error)||fallback);return data as T;}

/** Asset list and lifecycle only; all new transfers use AcademyResumableUpload. */
export function AcademyLessonAssets({lessonId,refreshKey=0}:{lessonId:string;refreshKey?:number}){
 const {language}=useAslanLanguage();
 const t=academyAssetCopy[language];
 const [assets,setAssets]=useState<Asset[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const load=useCallback(async()=>{const data=await json<{assets:Asset[]}>(await fetch('/api/academy/assets?lessonId='+lessonId,{cache:'no-store'}),t.operationFailed,language==='ar');setAssets(data.assets);},[lessonId,language,t.operationFailed]);
 useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:t.loadFailed));},[load,refreshKey,t.loadFailed]);
 async function change(assetId:string,remove:boolean){
 if(busy)return;setBusy(true);setError('');setNotice('');
 try{
 await json(await fetch('/api/academy/assets'+(remove?'?assetId='+assetId:''),{method:remove?'DELETE':'PATCH',headers:{'Content-Type':'application/json'},...(remove?{}:{body:JSON.stringify({assetId})})}),t.operationFailed,language==='ar');
 await load();setNotice(remove?t.deleted:t.saved);
 }catch(e){setError(e instanceof Error?e.message:t.operationFailed);}finally{setBusy(false);}
 }
 return <section style={{marginTop:16}}><h4>{t.heading}</h4>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {!assets.length&&<p className="muted">{t.empty}</p>}
 <ul>{assets.map(asset=><li key={asset.id} style={{marginTop:8}}>
 {asset.file_name} · {asset.file_size>=1073741824?(asset.file_size/1073741824).toFixed(2)+' GiB':(asset.file_size/1048576).toFixed(2)+' MiB'} · {t[asset.status as keyof typeof t]??asset.status}
 {asset.status==='ready'&&<> · <a href={'/api/academy/resources?assetId='+asset.id} target="_blank" rel="noreferrer">{t.open}</a></>}
 {asset.status==='pending'&&asset.storage_backend!=='contabo'&&<button disabled={busy} onClick={()=>void change(asset.id,false)}>{t.legacy}</button>}
 <button disabled={busy} onClick={()=>void change(asset.id,true)}>{asset.status==='archived'?t.retryDelete:t.delete}</button>
 </li>)}</ul></section>;
}
