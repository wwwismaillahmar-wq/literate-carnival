'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type RequestItem={id:string;requester_id:string;status:string;created_at:string};

export default function FriendRequestsPage(){
  const [items,setItems]=useState<RequestItem[]>([]);
  const [message,setMessage]=useState('');
  async function load(){const r=await fetch('/api/account/friendships');const d=await r.json().catch(()=>({}));if(r.ok)setItems((d.friendships||[]).filter((x:RequestItem)=>x.status==='pending'));else setMessage(d.error||'تعذر تحميل الطلبات.');}
  useEffect(()=>{load();},[]);
  async function act(id:string,status:'accepted'|'rejected'){const r=await fetch('/api/account/friendships',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({friendshipId:id,status})});const d=await r.json().catch(()=>({}));setMessage(r.ok?'تم تحديث الطلب.':(d.error||'تعذر تحديث الطلب.'));load();}
  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN FRIEND REQUESTS</span><h1>طلبات الصداقة</h1><p className="muted">الطلبات الواردة إلى حسابك.</p>
    <div className="card" style={{marginTop:28}}>{items.length?<div className="grid" style={{gap:12}}>{items.map(item=><article className="card" key={item.id}><p>من الحساب: <strong>{item.requester_id}</strong></p><div style={{display:'flex',gap:8}}><button className="btn primary" onClick={()=>act(item.id,'accepted')}>قبول</button><button className="btn secondary" onClick={()=>act(item.id,'rejected')}>رفض</button></div></article>)}</div>:<p className="muted">لا توجد طلبات جديدة.</p>}</div>
    {message&&<p className="muted" role="status">{message}</p>}<div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
  </div></main>;
}
