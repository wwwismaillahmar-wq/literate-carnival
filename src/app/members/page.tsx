'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import CommunityNav from '@/components/CommunityNav';
import MemberActions from '@/components/MemberActions';

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

  return <main className="section"><div className="wrap"><span className="kicker">ASLAN MEMBERS</span><h1>الأعضاء</h1><p className="lead">ابحث بالاسم أو username، ثم افتح الملف العام أو أدر علاقتك الاجتماعية.</p><CommunityNav/>
    <div className="card" style={{display:'flex',gap:10,marginBottom:24}}><input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(q)} placeholder="الاسم أو @username" /><button className="btn primary" onClick={()=>load(q)}>بحث</button></div>
    {message&&<p className="muted" role="status">{message}</p>}
    {loading?<p className="muted">جارٍ تحميل الأعضاء...</p>:members.length?<div className="grid three">{members.map(m=>{const r=relation(m.id);return <article className="card" key={m.id} style={{display:'grid',gap:10}}>{m.avatar_url?<img src={m.avatar_url} alt="" style={{width:76,height:76,borderRadius:'50%',objectFit:'cover'}}/>:<div className="social-avatar social-avatar--fallback">AS</div>}<div><Link className="member-name-link" href={m.username?`/members/${encodeURIComponent(m.username)}`:'#'}><h3 style={{margin:'0 0 2px'}}>{m.full_name||m.username||'عضو ASLAN'}</h3></Link>{m.username&&<div className="muted">@{m.username}</div>}{m.role&&<div className="muted">{m.role}</div>}</div><MemberActions member={m} showProfile={false}/></article>})}</div>:<div className="card"><h2>لا توجد نتائج.</h2></div>}
  </div></main>;
}
