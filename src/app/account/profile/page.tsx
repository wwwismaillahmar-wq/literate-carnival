'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import MessagePrivacySettings from '@/components/MessagePrivacySettings';

type Profile={full_name:string|null;username:string|null;avatar_path:string|null;avatar_url:string|null};

export default function ProfilePage(){
  const [profile,setProfile]=useState<Profile|null>(null);
  const [fullName,setFullName]=useState('');
  const [username,setUsername]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);
  const [uploading,setUploading]=useState(false);

  async function load(){
    const r=await fetch('/api/account/profile');
    const d=await r.json().catch(()=>({}));
    if(r.ok){setProfile(d.profile);setFullName(d.profile.full_name||'');setUsername(d.profile.username||'');}
    else setMessage(d.error||'تعذر تحميل الملف الشخصي.');
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function save(e:React.FormEvent){
    e.preventDefault();setMessage('');
    const r=await fetch('/api/account/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName,username})});
    const d=await r.json().catch(()=>({}));
    setMessage(r.ok?'تم حفظ الملف الشخصي.':(d.error||'تعذر الحفظ.'));
    if(r.ok)load();
  }

  async function upload(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0]; if(!file)return;
    if(file.size>5*1024*1024){setMessage('الصورة أكبر من 5MB.');return;}
    setUploading(true);setMessage('جارٍ رفع صورة الحساب...');
    try{
      const init=await fetch('/api/account/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mimeType:file.type,fileSize:file.size})});
      const d=await init.json().catch(()=>({}));
      if(!init.ok){setMessage(d.error||'تعذر تجهيز الرفع.');return;}
      const supabase=createClient();
      const {error}=await supabase.storage.from('aslan-media').uploadToSignedUrl(d.upload.path,d.upload.token,file,{contentType:file.type});
      if(error){setMessage('تعذر رفع الصورة: '+error.message);return;}
      const saved=await fetch('/api/account/profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatarPath:d.objectPath})});
      const sd=await saved.json().catch(()=>({}));
      if(!saved.ok){setMessage(sd.error||'تم رفع الصورة لكن تعذر حفظها.');return;}
      setMessage('تم تحديث صورة الحساب.');load();
    }catch(err){setMessage(err instanceof Error?err.message:'تعذر رفع الصورة.');}
    finally{setUploading(false);e.target.value='';}
  }

  if(loading)return <main className="section"><div className="wrap"><p className="muted">جارٍ التحميل...</p></div></main>;

  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN PROFILE</span><h1>الملف الشخصي</h1>
    <div className="card" style={{display:'grid',gap:18,marginTop:24}}>
      {profile?.avatar_url?<img src={profile.avatar_url} alt="صورة الحساب" style={{width:120,height:120,borderRadius:'50%',objectFit:'cover'}}/>:<div style={{width:120,height:120,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--surface-2,#eee)',fontSize:48}}>👤</div>}
      <label>صورة الحساب<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={upload} disabled={uploading}/></label>
      <small className="muted">JPG/PNG/WEBP/GIF — حتى 5MB.</small>
    </div>
    <MessagePrivacySettings />
    <form className="card" onSubmit={save} style={{display:'grid',gap:14,marginTop:18}}>
      <label>الاسم الكامل<input value={fullName} onChange={e=>setFullName(e.target.value)} /></label>
      <label>اسم المستخدم<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="مثال: aslan_user" /></label>
      <button className="btn primary" type="submit">حفظ التغييرات</button>
    </form>
    {message&&<p className="muted" role="status">{message}</p>}
    <div style={{display:'flex',gap:10,marginTop:24,flexWrap:'wrap'}}><Link className="btn secondary" href="/account/friends">البحث عن الأعضاء والأصدقاء</Link><Link className="btn secondary" href="/account">← حسابي</Link></div>
  </div></main>;
}
