'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Member={id:string;full_name:string|null;username:string|null;avatar_url:string|null};
type Friendship={id:string;requester_id:string;addressee_id:string;status:string};

export default function FriendsPage(){
  const [members,setMembers]=useState<Member[]>([]);
  const [items,setItems]=useState<Friendship[]>([]);
  const [q,setQ]=useState('');
  const [message,setMessage]=useState('');
  const [loading,setLoading]=useState(false);

  async function loadMembers(term=''){
    setLoading(true);
    const r=await fetch('/api/account/members?q='+encodeURIComponent(term));
    const d=await r.json().catch(()=>({}));
    if(r.ok)setMembers(d.members||[]); else setMessage(d.error||'تعذر تحميل الأعضاء.');
    setLoading(false);
  }
  async function loadFriends(){
    const r=await fetch('/api/account/friendships');
    const d=await r.json().catch(()=>({}));
    if(r.ok)setItems(d.friendships||[]);
  }
  useEffect(()=>{loadMembers();loadFriends();},[]);

  async function addFriend(id:string){
    setMessage('');
    const r=await fetch('/api/account/friendships',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({addresseeId:id})});
    const d=await r.json().catch(()=>({}));
    setMessage(r.ok?'تم إرسال طلب الصداقة.':(d.error||'تعذر إرسال الطلب.'));
    if(r.ok)loadFriends();
  }

  function relation(memberId:string){
    const x=items.find(f=>f.requester_id===memberId||f.addressee_id===memberId);
    return x?.status;
  }

  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN MEMBERS</span><h1>الأعضاء والأصدقاء</h1>
    <p className="muted">ابحث عن أي حساب بالاسم أو اسم المستخدم. لا تحتاج إلى معرفة UUID.</p>
    <div className="card" style={{display:'flex',gap:10,marginTop:24}}>
      <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')loadMembers(q)}} placeholder="ابحث بالاسم أو @username" style={{flex:1}} />
      <button className="btn primary" onClick={()=>loadMembers(q)}>بحث</button>
    </div>
    {message&&<p className="muted" role="status">{message}</p>}
    <div className="grid three" style={{marginTop:24}}>
      {loading?<p className="muted">جارٍ تحميل الأعضاء...</p>:members.map(m=><article className="card" key={m.id} style={{display:'grid',gap:10}}>
        {m.avatar_url?<img src={m.avatar_url} alt="" style={{width:72,height:72,borderRadius:'50%',objectFit:'cover'}}/>:<div aria-hidden="true" style={{width:72,height:72,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--surface-2,#eee)',fontSize:28}}>👤</div>}
        <strong>{m.full_name||m.username||'عضو ASLAN'}</strong>
        {m.username&&<span className="muted">@{m.username}</span>}
        {relation(m.id)==='accepted'?<span className="gold">صديق</span>:relation(m.id)==='pending'?<span className="muted">طلب قائم</span>:<button className="btn secondary" onClick={()=>addFriend(m.id)}>إضافة صديق</button>}
      </article>)}
    </div>
    <div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
  </div></main>;
}
