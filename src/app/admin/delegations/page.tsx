'use client';
import {useEffect,useState} from 'react';
type Person={id:string;full_name:string|null;username:string|null;email:string|null};
type Grant={id:string;subject_id:string;permission_key:string;can_delegate:boolean;expires_at:string|null};
export default function DelegationsWorkspace(){
 const [q,setQ]=useState(''),[people,setPeople]=useState<Person[]>([]),[selected,setSelected]=useState<Person|null>(null),[permission,setPermission]=useState('academy.manage'),[delegate,setDelegate]=useState(false),[grants,setGrants]=useState<Grant[]>([]),[message,setMessage]=useState('');
 useEffect(()=>{if(q.trim().length<2){setPeople([]);return;}const abort=new AbortController();const timer=setTimeout(()=>{fetch('/api/academy/tester-search?q='+encodeURIComponent(q),{signal:abort.signal}).then(r=>r.json()).then(v=>setPeople(v.users||[])).catch(()=>{});},300);return()=>{clearTimeout(timer);abort.abort();};},[q]);
 async function refresh(){const r=await fetch('/api/admin/delegations');const v=await r.json();setGrants(v.grants||[]);}
 useEffect(()=>{void refresh();},[]);
 async function revoke(grant:Grant){if(!window.confirm('هل تريد سحب الصلاحية '+grant.permission_key+'؟'))return;const r=await fetch('/api/admin/delegations',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({grantId:grant.id})});setMessage(r.ok?'تم سحب الصلاحية وتسجيل العملية.':'تعذر سحب الصلاحية.');if(r.ok)void refresh();}
 async function submit(e:React.FormEvent){e.preventDefault();if(!selected)return;const r=await fetch('/api/admin/delegations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subjectId:selected.id,permission,canDelegate:delegate})});setMessage(r.ok?'تم حفظ التفويض.':'تعذر حفظ التفويض.');if(r.ok)void refresh();}
 return <main className="section"><div className="wrap"><h1>إدارة التفويضات</h1><p>ابحث عن حساب مسجل، ثم امنحه صلاحية محددة.</p><form onSubmit={submit} style={{display:'grid',gap:12,maxWidth:620}}>
 <label>المستخدم<input value={q} onChange={e=>{setQ(e.target.value);setSelected(null);}} placeholder="الاسم أو البريد الإلكتروني" /></label>
 {people.map(p=><button key={p.id} type="button" onClick={()=>{setSelected(p);setQ(p.full_name||p.email||p.username||'مستخدم');setPeople([]);}}>{p.full_name||p.username||p.email} — {p.email}</button>)}
 {selected&&<p>المحدد: {selected.full_name||selected.email}</p>}
 <label>الصلاحية<select value={permission} onChange={e=>setPermission(e.target.value)}><option value="academy.manage">إدارة الأكاديمية</option><option value="academy.publish">نشر الدورات</option><option value="market.manage">إدارة السوق</option><option value="community.manage">إدارة المجتمع</option><option value="services.manage">إدارة الخدمات</option><option value="admin.delegate">إدارة التفويضات</option></select></label>
 <label><input type="checkbox" checked={delegate} onChange={e=>setDelegate(e.target.checked)}/> السماح بتفويض هذه الصلاحية</label>
 <button className="btn primary" disabled={!selected}>منح الصلاحية</button></form><p role="status">{message}</p><h2>التفويضات الحالية</h2>
 {grants.map(g=><p key={g.id}>{g.permission_key} — {g.subject_id} {g.can_delegate?'— يسمح بالتفويض':''} <button type="button" className="btn secondary" onClick={()=>void revoke(g)}>سحب الصلاحية</button></p>)}
 </div></main>;
}
