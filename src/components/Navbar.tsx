'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LocalePicker, useAslanLanguage } from '@/components/AslanLocale';
import { usePathname } from 'next/navigation';
import { Bell, Headset, Star } from 'lucide-react';
import { AslanBrandMark } from '@/components/AslanBrandMark';

type Profile={full_name:string|null;username:string|null;avatar_url:string|null};

export function Navbar(){
  const pathname=usePathname();
  const active=(href:string)=>href==='/'?pathname==='/':pathname===href||pathname.startsWith(href+'/');
  const [open,setOpen]=useState(false);
  const {language,change,t}=useAslanLanguage();
  const [profile,setProfile]=useState<Profile|null>(null);
  const [isAdmin,setIsAdmin]=useState(false);
  const [brandLogoUrl,setBrandLogoUrl]=useState<string|null>(null);
  const [brandGold,setBrandGold]=useState('#c9a45c');
  useEffect(()=>{fetch('/api/account/profile').then(async r=>r.ok?r.json():null).then(d=>{if(d?.profile)setProfile(d.profile);setIsAdmin(Boolean(d?.isAdmin))}).catch(()=>undefined);fetch('/api/platform/site-settings',{cache:'no-store'}).then(async r=>r.ok?r.json():null).then(d=>{if(typeof d?.brandLogoUrl==='string')setBrandLogoUrl(d.brandLogoUrl);if(typeof d?.settings?.brand_gold==='string'&&/^#[0-9a-f]{6}$/i.test(d.settings.brand_gold))setBrandGold(d.settings.brand_gold)}).catch(()=>undefined)},[]);
  const primary=['/','/market','/services','/academy','/partners','/company','/community'].map((href,index)=>[href,t(['home','market','services','academy','partners','company','community'][index])]);
  const community=[['/market/sell','مكتب التاجر'],['/market/requests','طلبات عروض الأسعار'],['/guides','دليل الاستخدام'],['/guides/management','دليل الأدوار'],['/guides/rules','قواعد الاستخدام'],['/members','الأعضاء'],['/account/friends','الأصدقاء'],['/account/friend-requests','طلبات الصداقة'],['/account/messages','الرسائل'],['/notifications','الإشعارات'],['/support','الدعم والشكاوى'],['/reviews','التقييمات'],['/account/posts','منشوراتي'],['/account/contributions','مساهماتي']];
  return <header className="shell-header">
    <div className="wrap" style={{minHeight:76,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
      <Link href="/" className="shell-brand" onClick={()=>setOpen(false)}>{brandLogoUrl?<img src={brandLogoUrl} alt="ASLAN Modelling Group" style={{maxWidth:120,maxHeight:48,objectFit:'contain'}}/>:<><AslanBrandMark size={44} decorative/><span className="shell-wordmark" style={{color:brandGold}}>ASLAN</span></>}<span><small style={{display:'block',fontSize:9,color:'var(--muted)',letterSpacing:'.18em'}}>MODELLING GROUP</small></span></Link>
      <nav className="shell-nav">{primary.map(([href,label])=><Link key={href} href={href} aria-current={active(href)?'page':undefined}>{label}</Link>)}</nav>
      <div className="shell-actions">
        <LocalePicker language={language} change={change}/>
        {profile?<><Link href="/account/messages" className="desktop-only" aria-label={t('messages')}>✉</Link><Link href="/notifications" className="desktop-only" aria-label={t('notifications')}><Bell size={18}/></Link><Link href="/support" className="desktop-only" aria-label={t('support')}><Headset size={18}/></Link><Link href="/reviews" className="desktop-only" aria-label={t('reviews')}><Star size={18}/></Link><Link href="/partner-portal" className="desktop-only">{t('partnerPortal')}</Link>{isAdmin&&<Link href="/admin/dashboard" className="btn secondary desktop-only">{t('admin')}</Link>}<Link href="/account" className="shell-user"><>{profile.avatar_url?<img src={profile.avatar_url} alt=""/>:<span className="shell-brand-mark" style={{width:34,height:34,fontSize:13}}>A</span>}</><span className="desktop-only">{profile.full_name||profile.username||'الحساب'}</span></Link></>:<><Link className="btn secondary desktop-only" href="/login">{t('login')}</Link><Link className="btn primary" href="/register">{t('register')}</Link></>}
        <button className="shell-mobile icon-button" onClick={()=>setOpen(v=>!v)} aria-label={t('menu')}>☰</button>
      </div>
    </div>
    {open&&<div className="wrap shell-mobile-menu" style={{padding:'12px 0 18px',display:'grid',gap:8}}>
      {primary.map(([href,label])=><Link key={href} href={href} aria-current={active(href)?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}
      <div style={{borderTop:'1px solid var(--line)',marginTop:4,paddingTop:8,display:'grid',gap:8}}>{community.map(([href,label])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}</div>
      {profile&&<Link href="/partner-portal" onClick={()=>setOpen(false)}>{t('partnerPortal')}</Link>}{isAdmin&&<div style={{borderTop:'1px solid var(--line)',marginTop:4,paddingTop:8,display:'grid',gap:8}}><Link href="/admin/dashboard" onClick={()=>setOpen(false)}>⚙️ لوحة الإدارة</Link><Link href="/products" onClick={()=>setOpen(false)}>👁️ معاينة المتجر كزائر</Link></div>}
      {!profile&&<><Link href="/login" onClick={()=>setOpen(false)}>{t('login')}</Link><Link href="/register" onClick={()=>setOpen(false)}>{t('register')}</Link></>}
    </div>}
  </header>;
}
