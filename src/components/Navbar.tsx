'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Profile={full_name:string|null;username:string|null;avatar_url:string|null};

export function Navbar(){
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);
  useEffect(()=>{fetch('/api/account/profile').then(async r=>r.ok?r.json():null).then(d=>d?.profile&&setProfile(d.profile)).catch(()=>undefined)},[]);
  const primary=[['/','الرئيسية'],['/products','المنتجات'],['/services','الخدمات'],['/academy','الأكاديمية'],['/community','المجتمع']];
  const community=[['/members','الأعضاء'],['/account/friends','الأصدقاء'],['/account/friend-requests','طلبات الصداقة'],['/account/messages','الرسائل'],['/account/posts','منشوراتي'],['/account/contributions','مساهماتي']];
  return <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(17,20,23,.96)',backdropFilter:'blur(14px)',borderBottom:'1px solid var(--line)'}}>
    <div className="wrap" style={{minHeight:76,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <Link href="/" className="shell-brand" onClick={()=>setOpen(false)}><span className="shell-brand-mark">A</span><span><span className="gold">ASLAN</span><small style={{display:'block',fontSize:9,color:'var(--muted)',letterSpacing:'.18em'}}>MODELLING GROUP</small></span></Link>
      <nav className="shell-nav">{primary.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav>
      <div className="shell-actions">
        {profile?<><Link href="/account/messages" className="desktop-only" aria-label="الرسائل">✉</Link><Link href="/account" className="shell-user"><>{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span className="shell-brand-mark" style={{width:34,height:34,fontSize:13}}>A</span>}</><span className="desktop-only">{profile.full_name||profile.username||'الحساب'}</span></Link></>:<><Link className="btn secondary desktop-only" href="/login">تسجيل الدخول</Link><Link className="btn primary" href="/register">إنشاء حساب</Link></>}
        <button className="shell-mobile icon-button" onClick={()=>setOpen(v=>!v)} aria-label="القائمة">☰</button>
      </div>
    </div>
    {open&&<div className="wrap" style={{padding:'12px 0 18px',display:'grid',gap:8}}>
      {primary.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}
      <div style={{borderTop:'1px solid var(--line)',marginTop:4,paddingTop:8,display:'grid',gap:8}}>{community.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}</div>
      {!profile&&<><Link href="/login" onClick={()=>setOpen(false)}>تسجيل الدخول</Link><Link href="/register" onClick={()=>setOpen(false)}>إنشاء حساب</Link></>}
    </div>}
  </header>;
}
