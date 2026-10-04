'use client';

import {useRef,useState} from 'react';
import {createClient} from '@/lib/supabase/client';

type Props={conversationId:string;onSent?:(messageId:string)=>void};
const MAX_FILE_SIZE=50*1024*1024;

function mediaTypeFor(file:File):'image'|'video'|'file'{
  if(file.type.startsWith('image/')) return 'image';
  if(file.type.startsWith('video/')) return 'video';
  return 'file';
}

export default function MessageComposer({conversationId,onSent}:Props){
  const [body,setBody]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const inputRef=useRef<HTMLInputElement|null>(null);

  async function uploadForMessage(messageId:string, selected:File){
    const mediaType=mediaTypeFor(selected);
    const init=await fetch('/api/account/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      messageId,mediaType,mimeType:selected.type||'application/octet-stream',fileSize:selected.size
    })});
    const data=await init.json().catch(()=>({}));
    if(!init.ok||!data.asset?.object_path) throw new Error(data.error||'تعذر تجهيز المرفق.');
    const supabase=createClient();
    const {error:uploadError}=await supabase.storage.from('aslan-media').upload(
      data.asset.object_path,selected,{contentType:selected.type||'application/octet-stream',cacheControl:'3600',upsert:false}
    );
    if(uploadError){
      await fetch('/api/account/media?assetId='+encodeURIComponent(data.asset.id),{method:'DELETE'}).catch(()=>undefined);
      throw new Error('تعذر رفع المرفق: '+uploadError.message);
    }
  }

  async function send(e:React.FormEvent){
    e.preventDefault();
    if(sending||(!body.trim()&&!file)) return;
    setSending(true);setError('');
    const text=body.trim()||'📎 مرفق';
    const selected=file;
    try{
      const r=await fetch('/api/account/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId,body:text})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok) throw new Error(data.error||'تعذر إرسال الرسالة.');
      const messageId=data.message?.id as string|undefined;
      if(selected&&messageId) await uploadForMessage(messageId,selected);
      setBody('');setFile(null);if(inputRef.current)inputRef.current.value='';
      if(messageId) onSent?.(messageId);
    }catch(err){setError(err instanceof Error?err.message:'تعذر إرسال الرسالة.');}
    finally{setSending(false);}
  }

  function choose(e:React.ChangeEvent<HTMLInputElement>){
    const selected=e.target.files?.[0]||null;
    if(selected&&selected.size>MAX_FILE_SIZE){setError('حجم المرفق يتجاوز 50MB.');e.target.value='';return;}
    setError('');setFile(selected);
  }

  return <div className='message-composer'>
    <form className='message-composer__form' onSubmit={send}>
      <textarea value={body} onChange={e=>setBody(e.target.value)} rows={2} maxLength={5000}
        placeholder={file?'أضف تعليقًا للمرفق أو أرسل مباشرة...':'اكتب رسالة...'}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/>
      <div className='message-composer__actions'>
        <label className='message-attach-button' title='إضافة صورة أو فيديو أو مستند' aria-label='إضافة صورة أو فيديو أو مستند'>
          <span>📎</span><input ref={inputRef} type='file' accept='image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip' onChange={choose} disabled={sending}/>
        </label>
        <button className='btn primary' type='submit' disabled={sending||(!body.trim()&&!file)}>{sending?'جارٍ الإرسال...':'إرسال'}</button>
      </div>
    </form>
    {file&&<div className='message-composer__pending'>📎 {file.name}<button type='button' onClick={()=>{setFile(null);if(inputRef.current)inputRef.current.value=''}}>×</button></div>}
    {error&&<p className='error-text' role='alert'>{error}</p>}
  </div>;
}
