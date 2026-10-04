'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import CommunityNav from '@/components/CommunityNav';
import MediaUploader from '@/components/MediaUploader';
import {createClient} from '@/lib/supabase/client';

type Conversation={id:string;other:{id:string;full_name:string|null;username:string|null;role:string|null}|null;avatar_url:string|null;last_message:{body:string;created_at:string;read_at:string|null;sender_id:string}|null;unread:boolean};
type Member={id:string;full_name:string|null;username:string|null;role:string|null;avatar_url:string|null};
type Message={id:string;conversation_id:string;sender_id:string;body:string;created_at:string;read_at:string|null;media?:Array<{id:string;media_type:'image'|'video'|'file';signed_url:string|null;object_path:string}>};

export default function MessagesPage(){
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [selected,setSelected]=useState('');
  const [messages,setMessages]=useState<Message[]>([]);
  const [body,setBody]=useState('');
  const [message,setMessage]=useState('');
  const [mobileChat,setMobileChat]=useState(false);const [lastSentId,setLastSentId]=useState('');
  const endRef=useRef<HTMLDivElement|null>(null);

  async function loadConversations(preferred?:string){
    const r=await fetch('/api/account/conversations',{cache:'no-store'});const d=await r.json().catch(()=>({}));
    if(r.ok){setConversations(d.conversations||[]);if(preferred||!selected){const id=preferred||d.conversations?.[0]?.id;if(id)loadMessages(id);}}
    else setMessage(d.error||'تعذر تحميل المحادثات.');
  }
  async function loadMessages(id:string){
    setSelected(id);setLastSentId('');setMobileChat(true);
    const r=await fetch('/api/account/messages?conversationId='+encodeURIComponent(id),{cache:'no-store'});const d=await r.json().catch(()=>({}));
    if(r.ok){setMessages(d.messages||[]);setConversations(items=>items.map(c=>c.id===id?{...c,unread:false}:c));}else setMessage(d.error||'تعذر تحميل الرسائل.');
  }
  async function startWithUsername(username:string){
    const mr=await fetch('/api/account/members?q='+encodeURIComponent(username));const md=await mr.json().catch(()=>({}));
    const member=(md.members as Member[]|undefined)?.find(m=>m.username?.toLowerCase()===username.toLowerCase());
    if(!member){setMessage('تعذر العثور على العضو.');return;}
    const r=await fetch('/api/account/conversations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({participantId:member.id})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){setMessage(d.error||'تعذر بدء المحادثة.');return;}
    await loadConversations(d.conversation?.id);
  }
  async function send(e:React.FormEvent){
    e.preventDefault();if(!selected||!body.trim())return;
    const text=body.trim();setBody('');
    const r=await fetch('/api/account/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conversationId:selected,body:text})});
    const d=await r.json().catch(()=>({}));
    if(r.ok){setMessages(items=>[...items,d.message]);setLastSentId(d.message.id);loadConversations(selected);}else{setBody(text);setMessage(d.error||'تعذر إرسال الرسالة.');}
  }
  useEffect(()=>{const withUser=new URLSearchParams(window.location.search).get('with');if(withUser)startWithUsername(withUser);else loadConversations();},[]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages]);
  useEffect(()=>{if(!selected)return;const supabase=createClient();const channel=supabase.channel('account-messages-'+selected).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:'conversation_id=eq.'+selected},()=>loadMessages(selected)).subscribe();return()=>{supabase.removeChannel(channel)}},[selected]);

  const active=conversations.find(c=>c.id===selected);
  return <main className="section"><div className="wrap"><span className="kicker">ASLAN MESSENGER</span><h1>الرسائل</h1><p className="lead">محادثات مباشرة وفق إعداد استقبال الرسائل لكل عضو، مع دعم الصور والفيديو والملفات.</p><CommunityNav/>
    <div className={`messenger ${mobileChat?'messenger--chat-open':''}`}>
      <aside className="messenger__list"><div className="messenger__list-head"><strong>المحادثات</strong><span className="muted">{conversations.length}</span></div>{conversations.length?conversations.map(c=><button key={c.id} className={`conversation-row ${c.id===selected?'is-active':''}`} onClick={()=>loadMessages(c.id)}>{c.avatar_url?<img src={c.avatar_url} alt="" />:<span className="conversation-avatar">AS</span>}<span className="conversation-copy"><strong>{c.other?.full_name||c.other?.username||'عضو ASLAN'}</strong><small>@{c.other?.username||'member'}</small><small>{c.last_message?.body||'لا توجد رسائل بعد'}</small></span>{c.unread&&<span className="unread-dot" aria-label="رسالة غير مقروءة"/>}</button>):<div className="messenger-empty"><p>لا توجد محادثات.</p><Link href="/members" className="btn secondary">ابحث عن صديق</Link></div>}</aside>
      <section className="messenger__chat">{active?<><header className="chat-head"><button className="chat-back" onClick={()=>setMobileChat(false)}>←</button>{active.avatar_url?<img src={active.avatar_url} alt="" />:<span className="conversation-avatar">AS</span>}<div><strong>{active.other?.full_name||active.other?.username}</strong><small>@{active.other?.username}</small></div></header><div className="chat-body">{messages.map(m=><div key={m.id} className={`message-row ${m.sender_id===active.other?.id?'message-row--in':'message-row--out'}`}><div className="message-bubble"><div>{m.body}</div>{m.media?.length&&<div className='message-attachments'>{m.media.map(a=>a.signed_url&&(a.media_type==='image'?<img key={a.id} src={a.signed_url} alt=''/>:a.media_type==='video'?<video key={a.id} src={a.signed_url} controls/>:<a key={a.id} href={a.signed_url} target='_blank' rel='noreferrer'>📎 {a.object_path.split('/').pop()}</a>))}</div>}<small>{new Date(m.created_at).toLocaleTimeString('ar-DZ',{hour:'2-digit',minute:'2-digit'})}{m.sender_id!==active.other?.id&&<span>{m.read_at?' · مقروءة':' · مرسلة'}</span>}</small></div></div>)}<div ref={endRef}/></div><form className="chat-composer" onSubmit={send}><textarea value={body} onChange={e=>setBody(e.target.value)} rows={2} maxLength={5000} placeholder="اكتب رسالة..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button className="btn primary" disabled={!body.trim()}>إرسال</button></form>{lastSentId&&<MediaUploader messageId={lastSentId} compact onUploaded={()=>loadMessages(selected)}/>}</section></>:<div className="messenger-placeholder"><div className="conversation-avatar">AS</div><h2>اختر محادثة</h2><p className="muted">ستظهر الرسائل هنا بعد اختيار صديق.</p></div>}</section>
    </div>{message&&<p className="muted" role="status">{message}</p>}
  </div></main>;
}
