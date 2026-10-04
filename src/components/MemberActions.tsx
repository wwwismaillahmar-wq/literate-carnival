'use client';

import Link from 'next/link';
import {useEffect,useState} from 'react';
import MessengerPopover from '@/components/MessengerPopover';

type Props={member:{id:string;full_name:string|null;username:string|null;avatar_url?:string|null};showProfile?:boolean};

export default function MemberActions({member,showProfile=true}:Props){
  const [relation,setRelation]=useState<{id:string;requester_id:string;addressee_id:string;status:string}|null>(null);
  const [open,setOpen]=useState(false);const [message,setMessage]=useState('');
  async function load(){const r=await fetch('/api/account/friendships',{cache:'no-store'});const d=await r.json().catch(()=>({}));if(r.ok)setRelation((d.friendships||[]).find((x:{requester_id:string;addressee_id:string})=>x.requester_id===member.id||x.addressee_id===member.id)||null);}
  useEffect(()=>{load()},[member.id]);
  async function add(){setMessage('');const r=await fetch('/api/account/friendships',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({addresseeId:member.id})});const d=await r.json().catch(()=>({}));setMessage(r.ok?'تم إرسال طلب الصداقة.':(d.error||'تعذر إرسال الطلب.'));if(r.ok)load();}
  return <div className='member-actions'>
    {showProfile&&<Link className='member-name-link' href={'/members/'+encodeURIComponent(member.username||member.id)}>{member.full_name||member.username||'عضو ASLAN'}</Link>}
    <div className='member-actions__icons'>
      {!relation||relation.status==='rejected'||relation.status==='cancelled'?<button className='icon-button member-action-icon' onClick={add} title='إضافة صديق' aria-label='إضافة صديق'>＋</button>:<span className='member-action-status' title={relation.status==='accepted'?'صديق':relation.status==='pending'?'طلب قائم':'حالة العلاقة'}>{relation.status==='accepted'?'✓':relation.status==='pending'?'…':'•'}</span>}
      <button className='icon-button member-action-icon' onClick={()=>setOpen(true)} title='مراسلة' aria-label='مراسلة'>✉</button>
    </div>
    {message&&<small className='muted'>{message}</small>}
    {open&&<div className='message-popover-layer' onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><MessengerPopover participant={member} onClose={()=>setOpen(false)}/></div>}
  </div>;
}