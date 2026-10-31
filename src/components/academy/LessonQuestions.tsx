'use client';
import {useEffect,useState} from 'react';
type Question={id:string;body:string;answer:string|null;created_at:string;answered_at:string|null};
export function LessonQuestions({lessonId}:{lessonId:string}){
 const [items,setItems]=useState<Question[]>([]),[question,setQuestion]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 async function load(){const response=await fetch('/api/academy/lesson-questions?lessonId='+encodeURIComponent(lessonId),{cache:'no-store'});const data=await response.json();if(!response.ok)throw new Error(data.error||'تعذر التحميل');setItems(data.questions??[]);}
 useEffect(()=>{void load().catch(e=>setError(e.message));},[lessonId]);
 async function send(){if(busy)return;setBusy(true);setError('');setNotice('');
 try{const response=await fetch('/api/academy/lesson-questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lessonId,question})});const data=await response.json();if(!response.ok)throw new Error(data.error||'تعذر الإرسال');setQuestion('');setNotice('تم إرسال سؤالك إلى فريق الدورة.');await load();}
 catch(e){setError(e instanceof Error?e.message:'تعذر إرسال السؤال');}finally{setBusy(false);}}
 return <section className="card" style={{marginTop:20}}><h2>أسئلة الدرس والتواصل مع الأستاذ</h2>
 <label>اكتب استفسارك<textarea value={question} maxLength={4000} rows={4} onChange={e=>setQuestion(e.target.value)}/></label>
 <button type="button" disabled={busy||question.trim().length<3} onClick={()=>void send()}>{busy?'جارٍ الإرسال...':'إرسال السؤال'}</button>
 {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {items.map(item=><article key={item.id} style={{marginTop:16}}><p><strong>سؤالك:</strong> {item.body}</p><p><strong>رد الأستاذ:</strong> {item.answer??'بانتظار الرد'}</p></article>)}
 </section>;
}