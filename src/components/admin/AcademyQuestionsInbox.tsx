'use client';
import {useEffect,useState} from 'react';
type Item={id:string;lesson_id:string;student_id:string;body:string;answer:string|null;created_at:string};
export function AcademyQuestionsInbox(){
 const [items,setItems]=useState<Item[]>([]),[answers,setAnswers]=useState<Record<string,string>>({}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const r=await fetch('/api/academy/lesson-questions/admin',{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error||'تعذر التحميل');setItems(data.questions??[]);}
 useEffect(()=>{void load().catch(e=>setError(e.message));const timer=setInterval(()=>{if(document.visibilityState==='visible')void load().catch(()=>{});},20000);return()=>clearInterval(timer);},[]);
 async function reply(id:string){if(busy)return;setBusy(id);setError('');setNotice('');
 try{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{const r=await fetch('/api/academy/lesson-questions/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,answer:answers[id]}),signal:controller.signal});const data=await r.json();if(!r.ok)throw new Error(data.error||'تعذر حفظ الرد');setNotice('تم حفظ الرد.');await load();}finally{clearTimeout(timeout);}}
 catch(e){setError(e instanceof Error?e.message:'تعذر الرد');}finally{setBusy('');}}
 return <section style={{marginTop:30}}><h2>استفسارات الطلاب</h2><p role="status">بانتظار الرد: {items.filter(x=>!x.answer).length}</p>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {items.map(x=><article className="card" key={x.id} style={{marginTop:12}}><p>الدرس: {x.lesson_id} · الطالب: {x.student_id}</p><p>{x.body}</p>{x.answer?<p>الرد: {x.answer}</p>:<><textarea aria-label="رد الأستاذ" rows={3} value={answers[x.id]??''} onChange={e=>setAnswers(v=>({...v,[x.id]:e.target.value}))}/><button type="button" disabled={!!busy||!(answers[x.id]??'').trim()} onClick={()=>void reply(x.id)}>إرسال الرد</button></>}</article>)}
 </section>;
}