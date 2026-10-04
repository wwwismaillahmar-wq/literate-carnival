'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CommunityNav from '@/components/CommunityNav';

type Member={id:string;full_name:string|null;username:string|null;avatar_url:string|null;role:string|null};
type Friendship={id:string;requester_id:string;addressee_id:string;status:string};

export default function MembersPage(){
  const [members,setMembers]=useState<Member[]>([]);
  const [relations,setRelations]=useState<Friendship[]>([]);
  const [q,setQ]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(true);

  async function load(term=''){
    setLoading(true);
    const [mr,fr]=await Promise.all([fetch('/api/account/members?q='+encodeURIComponent(term)),fetch('/api/account/friendships')]);
    const md=await mr.json().catch(()=>({})); const fd=await fr.json().catch(()=>({}));
    if(mr.ok)setMembers(md.members||[]);else setMessage(md.error||'تعذر تحميل الأعضاء.');
    if(fr.ok)setRelations(fd.friendships||[]);
    setLoading(false);
  }
  useEffect(()=>{load()},[]);

  function relation(id:string){return relations.find(x=>x.requester_id===id||x.addressee_id===id)}
  async function addFriend(id:string){
    const r=await fetch('/api/account/friendships',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({addresseeId:id})});
    const d=await r.json().catch(()=>({}));setMessage(r.ok?'تم إرسال طلب الصداقة.':(d.error||'تعذر إرسال الطلب.'));if(r.ok)load(q);
  }

  return <main className="section"><div className="wrap"><span className="kicker">ASLAN MEMBERS</span><h1>الأعضاء</h1><p className="lead">ابحث بالاسم أو username، ثم افتح الملف العام أو أدر علاقتك الاجتماعية.</p><CommunityNav/>
    <div className="card" style={{display:'flex',gap:10,marginBottom:24}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(q)} placeholder="الاسم أو @username" /><button className="btn primary" onClick={()=>load(q)}>بحث</button></div>
    {message&&<p className="muted" role="status">{message}</p>}
    {loading?<p className="muted">جارٍ تحميل الأعضاء...</p>:members.length?<div className="grid three">{members.map(m=>{const r=relation(m.id);return <article className="card" key={m.id} style={{display:'grid',gap:10}}>{m.avatar_url?<img src={m.avatar_url} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover'}}/>:<div className="social-avatar social-avatar--fallback">AS</div>}<div><h3 style={{margin:'0 0 2px'}}>{m.full_name||m.username||'عضو ASLAN'}</h3>{m.username&&<div className="muted">@{m.username}</div>}{m.role&&<div className="muted">{m.role}</div>}</div><div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="btn secondary" href={m.username?`/members/${encodeURIComponent(m.username)}`:'#'}>الملف العام</Link>{r?.status==='accepted'?<span className="btn secondary">صديق</span>:r?.status==='pending'?<span className="btn secondary">طلب قائم</span>:<button className="btn primary" onClick={()=>addFriend(m.id)}>إضافة صديق</button>}</div></article>})}</div>:<div className="card"><h2>لا توجد نتائج.</h2></div>}
  </div></main>;
}
