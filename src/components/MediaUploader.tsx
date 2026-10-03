'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Props = { postId?: string; contributionId?: string; };

export default function MediaUploader({ postId, contributionId }: Props) {
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  async function upload(event:React.ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];
    if(!file)return;
    setLoading(true);setMessage('');
    const mediaType=file.type.startsWith('video/')?'video':file.type.startsWith('image/')?'image':'';
    if(!mediaType){setMessage('اختر صورة أو فيديو.');setLoading(false);return;}
    const init=await fetch('/api/account/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({postId,contributionId,mediaType,mimeType:file.type,fileSize:file.size})});
    const data=await init.json().catch(()=>({}));
    if(!init.ok){setMessage(data.error||'تعذر تهيئة الرفع.');setLoading(false);return;}
    const supabase=createClient();
    const {error}=await supabase.storage.from('aslan-media').uploadToSignedUrl(data.upload.path,data.upload.token,file,{contentType:file.type});
    if(error){setMessage('تعذر رفع الملف. احذف السجل الوسيط إن لزم ثم أعد المحاولة.');setLoading(false);return;}
    setMessage('تم رفع الوسائط بنجاح.');setLoading(false);event.target.value='';
  }

  return <div className="card" style={{display:'grid',gap:10}}>
    <span className="kicker">الصور والفيديو</span>
    <input type="file" accept="image/*,video/*" onChange={upload} disabled={loading}/>
    <p className="muted">{loading?'جارٍ الرفع...':message||'الحد الحالي 50MB لكل ملف.'}</p>
  </div>;
}
