'use client';
import { useEffect, useState } from 'react';
type C={id:string;title:string}; type P={id:string;full_name:string|null;username:string|null}; type S={id:string;course_id:string;user_id:string;staff_role:string;status:string};
export function AcademyStaffWorkspace(){
 const [courses,setCourses]=useState<C[]>([]),[profiles,setProfiles]=useState<P[]>([]),[staff,setStaff]=useState<S[]>([]);
 const [courseId,setCourseId]=useState(''),[userId,setUserId]=useState(''),[staffRole,setStaffRole]=useState('teacher'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await fetch('/api/academy/staff',{cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error||'تعذر التحميل');setCourses(j.courses||[]);setProfiles(j.profiles||[]);setStaff(j.staff||[]);setCourseId(v=>v||j.courses?.[0]?.id||'');setUserId(v=>v||j.profiles?.[0]?.id||'')}
 useEffect(()=>{load().catch(e=>setMessage(e.message))},[]);
 async function send(method:string,body:unknown){setBusy(true);setMessage('');try{const r=await fetch('/api/academy/staff',{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||'تعذر الحفظ');setMessage('تم الحفظ.');await load()}catch(e){setMessage(e instanceof Error?e.message:'تعذر الحفظ')}finally{setBusy(false)}}
 const person=(id:string)=>{const p=profiles.find(x=>x.id===id);return p?[p.full_name,p.username].filter(Boolean).join(' · ')||id:id};
 const course=(id:string)=>courses.find(x=>x.id===id)?.title||id;
 return <section style={{marginTop:32,padding:20,border:'1px solid var(--border, #ddd)',borderRadius:14}}>
 <h2>تكليف المدرسين والمشرفين</h2><p className="muted">تُمنح الصلاحية للدورة المحددة فقط، ويمكن إيقافها دون حذف سجل التكليف.</p>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:12}}>
 <label>الدورة<select value={courseId} onChange={e=>setCourseId(e.target.value)} style={{display:'block',width:'100%'}}><option value="">اختر</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
 <label>العضو<select value={userId} onChange={e=>setUserId(e.target.value)} style={{display:'block',width:'100%'}}><option value="">اختر</option>{profiles.map(p=><option key={p.id} value={p.id}>{[p.full_name,p.username].filter(Boolean).join(' · ')||p.id}</option>)}</select></label>
 <label>الدور<select value={staffRole} onChange={e=>setStaffRole(e.target.value)} style={{display:'block',width:'100%'}}><option value="teacher">مدرّس</option><option value="supervisor">مشرف</option><option value="course_manager">مسؤول دورة</option></select></label></div>
 <button className="btn" disabled={busy||!courseId||!userId} onClick={()=>send('POST',{courseId,userId,staffRole})} style={{marginTop:12}}>{busy?'جارٍ الحفظ…':'حفظ التكليف'}</button>{message&&<p role="status">{message}</p>}
 <div style={{overflowX:'auto',marginTop:18}}><table style={{width:'100%'}}><thead><tr><th>الدورة</th><th>العضو</th><th>الدور</th><th>الحالة</th><th>الإجراء</th></tr></thead><tbody>{staff.map(s=><tr key={s.id}><td>{course(s.course_id)}</td><td>{person(s.user_id)}</td><td>{{teacher:'مدرّس',supervisor:'مشرف',course_manager:'مسؤول دورة'}[s.staff_role]||s.staff_role}</td><td>{s.status==='active'?'فعّال':'موقوف'}</td><td><button className="btn secondary" disabled={busy} onClick={()=>send('PATCH',{id:s.id,status:s.status==='active'?'inactive':'active'})}>{s.status==='active'?'إيقاف':'تفعيل'}</button></td></tr>)}</tbody></table>{staff.length===0&&<p className="muted">لا توجد تكليفات بعد.</p>}</div></section>
}