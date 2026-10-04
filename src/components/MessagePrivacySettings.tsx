'use client';
import {useEffect,useState} from 'react';
const options=[['members_only','الأعضاء فقط'],['all_members','كل الأعضاء'],['community','المجتمع كله'],['friends','الأصدقاء فقط']] as const;
export default function MessagePrivacySettings(){
 const [value,setValue]=useState('all_members');const [message,setMessage]=useState('');
 useEffect(()=>{fetch('/api/account/profile').then(async r=>r.ok?r.json():null).then(d=>d?.profile?.message_privacy&&setValue(d.profile.message_privacy)).catch(()=>undefined)},[]);
 async function save(v:string){setValue(v);const r=await fetch('/api/account/profile',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({messagePrivacy:v})});const d=await r.json().catch(()=>({}));setMessage(r.ok?'تم حفظ إعداد المراسلة.':(d.error||'تعذر حفظ الإعداد.'))}
 return <div className='card' style={{display:'grid',gap:12}}><span className='kicker'>الخصوصية الاجتماعية</span><h2 style={{margin:0}}>من يمكنه مراسلتي؟</h2><div className='privacy-options'>{options.map(([id,label])=><label key={id} className={'privacy-option '+(value===id?'is-active':'')}><input type='radio' name='messagePrivacy' checked={value===id} onChange={()=>save(id)}/><span>{label}</span></label>)}</div><p className='muted'>في هذه المرحلة «الأعضاء فقط» و«كل الأعضاء» و«المجتمع كله» تعتمد جميعها على الحسابات المسجلة؛ سنفصل نطاق المجتمع عن العضوية عندما نضيف نظام عضوية مستقل.</p>{message&&<p className='muted' role='status'>{message}</p>}</div>;
}