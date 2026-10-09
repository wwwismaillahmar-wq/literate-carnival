'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Profile={full_name:string|null;username:string|null;avatar_url:string|null};

export function Navbar(){
  const [open,setOpen]=useState(false);
  const [profile,setProfile]=useState<Profile|null>(null);
  const [isAdmin,setIsAdmin]=useState(false);
  useEffect(()=>{fetch('/api/account/profile').then(async r=>r.ok?r.json():null).then(d=>{if(d?.profile)setProfile(d.profile);setIsAdmin(Boolean(d?.isAdmin))}).catch(()=>undefined)},[]);
  const primary=[['/','الرئيسية'],['/products','المنتجات'],['/services','الخدمات'],['/academy','الأكاديمية'],['/partners','الشركاء'],['/company','الشركة'],['/community','المجتمع']];
  const community=[['/members','الأعضاء'],['/account/friends','الأصدقاء'],['/account/friend-requests','طلبات الصداقة'],['/account/messages','الرسائل'],['/notifications','الإشعارات'],['/support','الدعم والشكاوى'],['/reviews','التقييمات'],['/account/posts','منشوراتي'],['/account/contributions','مساهماتي']];
  return <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(17,20,23,.96)',backdropFilter:'blur(14px)',borderBottom:'1px solid var(--line)'}}>
    <div className="wrap" style={{minHeight:76,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <Link href="/" className="shell-brand" onClick={()=>setO���q�^