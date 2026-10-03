'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Conversation={id:string;participant_a:string;participant_b:string;updated_at:string};
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string;read_at:string|null};

export default function MessagesPage(){
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [body,setBody]=useState('');
  const [message,setMessage]=useState('');

  async function loadConversations(){const r=await fetch('/api/account/conversations');const d=await r.json().catch(()=>({}));if(r.ok)setConversations(d.conversations||[]);else setMessage(d.error||'تعذر تحميل المحادثات.');}
  async function loadMessages(id:string){setSelected(id);const r=await fetch('/api/account/messages?conversationId='+encodeURIComponent(id));const d=await r.json().catch(()=>({}));if(r.ok)setMessages(d.messages||[]);else setMessage(d.error||'تعذر تحميل الرسائل.');}
  async function send(e:React.FormEvent){e.preventDefault();if(!selected||!body.trim())return;const r=await fetch('/api/account/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:selected,body})});const d=await r.json().catch(()=>({}));if(r.ok){setBody('');loadMessages(selected);loadConversations();}else setMessage(d.error||'تعذر إرسال الرسالة.');}
  useEffect(()=>{loadConversations();},[]);

  return <main className="section" style={{minHeight:'70vh'}}><div className="wrap">
    <span className="kicker">ASLAN MESSAGES</span><h1>رسائلي</h1><p className="muted">محادثات مباشرة بين الأصدقاء المقبولين.</p>
    <div className="grid two" style={{marginTop:28,gap:18}}>
      <section className="card"><h2>المحادثات</h2>{conversations.length?<div className="grid" style={{gap:8}}>{conversations.map(c=><button className="btn secondary" key={c.id} onClick={()=>loadMessages(c.id)}>{c.participant_a} ↔ {c.participant_b}</button>)}</div>:<p className="muted">لا توجد محادثات بعد.</p>}</section>
      <section className="card"><h2>الرسائل</h2>{selected?<><div style={{display:'grid',gap:10,maxHeight:420,overflow:'auto'}}>{messages.map(m=><article className="card" key={m.id}><p>{m.body}</p><small className="muted">{new Date(m.created_at).toLocaleString('ar-DZ')}</small></article>)}</div><form onSubmit={send} style={{display:'grid',gap:10,marginTop:14}}><textarea value={body} onChange={e=>setBody(e.target.value)} rows={4} maxLength={5000} placeholder="اكتب رسالتك..." required/><button className="btn primary">إرسال</button></form></>:<p className="muted">اختر محادثة.</p>}</section>
    </div>
    {message&&<p className="muted" role="status">{message}</p>}<div style={{marginTop:24}}><Link className="btn secondary" href="/account">← العودة إلى حسابي</Link></div>
  </div></main>;
}
