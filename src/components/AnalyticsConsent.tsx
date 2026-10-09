'use client';
import { useEffect,useState } from 'react';
import { usePathname } from 'next/navigation';
const KEY='aslan-analytics-consent';
export function AnalyticsConsent() {
 const [choice,setChoice]=useState<'accepted'|'rejected'|null>(null);
 const pathname=usePathname();
 useEffect(()=>{const saved=window.localStorage.getItem(KEY);if(saved==='accepted'||saved==='rejected')setChoice(saved)},[]);
 useEffect(()=>{
  if(choice!=='accepted')return;
  const params=new URLSearchParams(window.location.search);
  const body={event_name:'page_view',path:pathname||'/',referrer:document.referrer||null,utm_source:params.get('utm_source'),utm_campaign:params.get('utm_campaign')};
  void fetch('/api/analytics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
 },[choice,pathname]);
 if(choice!==null)return null;
 const choose=(v:'accepted'|'rejected')=>{window.localStorage.setItem(KEY,v);setChoice(v)};
 return <aside role="region" aria-label="تفضيلات التحليلات" className="card" style={{position:'fixed',zIndex:120,bottom:16,left:16,right:16,maxWidth:760,margin:'0 auto',boxShadow:'0 12px 40px rgba(0,0,0,.35)'}}>
  <strong>الخصوصية وقياس الأداء</strong><p className="muted">تساعدنا تحليلات استخدام محدودة على تحسين الموقع. لا نرسل أحداث الاستخدام قبل موافقتك، ويمكنك الرفض دون تعطيل الموقع.</p>
  <div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="btn gold" onClick={()=>choose('accepted')}>موافقة على التحليلات</button><button className="btn line" onClick={()=>choose('rejected')}>رفض التحليلات</button></div>
 </aside>;
}
