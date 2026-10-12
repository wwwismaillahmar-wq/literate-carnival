'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
type Question={id:string;prompt:string;question_type:'text'|'single_choice'|'yes_no';options:string[];required:boolean};
type Offering={id:string;label:string;language:string;capacity:number|null};
export function AcademyAdmissionForm({courseId,offerings=[]}:{courseId:string;offerings?:Offering[]}) {
 const [questions,setQuestions]=useState<Question[]>([]);
 const [offeringId,setOfferingId]=useState('');
 const [name,setName]=useState('');const [email,setEmail]=useState('');const [phone,setPhone]=useState('');
 const [answers,setAnswers]=useState<Record<string,string>>({});const [consent,setConsent]=useState(false);
 const [loading,setLoading]=useState(true);const [ready,setReady]=useState(false);const [busy,setBusy]=useState(false);
 const [loadError,setLoadError]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');const [retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  setReady(false);setQuestions([]);setAnswers({});setLoadError('');setError('');
  if(offerings.length && !offeringId){setLoading(false);return ()=>{active=false;};}
  void(async()=>{setLoading(true);try{
   const response=await fetch('/api/academy/admission-questions?courseId='+encodeURIComponent(courseId)+(offeringId?'&offeringId='+encodeURIComponent(offeringId):''),{cache:'no-store'});
   const result=await response.json() as {questions?:Question[];error?:string};
   if(!response.ok || !Array.isArray(result.questions))throw new Error(result.error||'تعذر تحميل أسئلة القبول.');
   if(active){setQuestions(result.questions);setReady(true);}
  }catch(err){if(active)setLoadError(err instanceof Error?err.message:'تعذر تحميل أسئلة القبول.');}finally{if(active)setLoading(false);}})();
  return ()=>{active=false;};
 },[courseId,offeringId,offerings.length,retry]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy||!ready||notice)return;setBusy(true);setError('');
  try{
   const response=await fetch('/api/academy/admissions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId,offeringId:offeringId||null,name,email,phone,answers,consent})});
   const result=await response.json() as {application?:{id:string};message?:string;error?:string};
   if(!response.ok||!result.application?.id)throw new Error(result.error||'تعذر إرسال الطلب.');
   setNotice((result.message||'تم إرسال طلبك للمراجعة.')+' رقم الطلب: '+result.application.id);
  }catch(err){setError(err instanceof Error?err.message:'تعذر إرسال الطلب.');}finally{setBusy(false);}
 }
 return <section className="card"><span className="kicker">طلب الالتحاق</span><h2>بيانات المتقدم وأسئلة القبول</h2><p className="muted">لن يُطلب منك الدفع قبل صدور قرار القبول. راجع بياناتك قبل إرسال الطلب.</p>
  {notice ? <div role="status"><p>{notice}</p><Link href="/account/academy" className="btn primary">متابعة طلب القبول</Link></div> : <form onSubmit={submit}>
   <fieldset disabled={busy} style={{border:0,padding:0,margin:0,display:'grid',gap:14}}>
    {offerings.length>0 && <label>المدرسة أو الفرع واللغة<select required value={offeringId} onChange={event=>setOfferingId(event.target.value)}><option value="">اختر العرض التعليمي</option>{offerings.map(offering=><option key={offering.id} value={offering.id}>{offering.label} — {(offering.language||'').toUpperCase()}{offering.capacity!==null?' — السعة المعلنة '+offering.capacity:''}</option>)}</select></label>}
    <label>الاسم الكامل<input required autoComplete="name" minLength={2} maxLength={160} value={name} onChange={event=>setName(event.target.value)}/></label>
    <label>البريد الإلكتروني<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label>
    <label>رقم الهاتف<input required type="tel" autoComplete="tel" minLength={6} maxLength={30} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
    {loading && <p role="status">جارٍ تحميل أسئلة القبول...</p>}
    {loadError && <div role="alert"><p>{loadError}</p><button type="button" className="btn secondary" onClick={()=>setRetry(value=>value+1)}>إعادة المحاولة</button></div>}
    {ready && !questions.length && <p className="muted">لا توجد أسئلة تأهيل إضافية لهذا العرض. ستراجع الإدارة بيانات طلبك.</p>}
    {questions.map((question,index)=><label key={question.id}>{index+1}. {question.prompt}{question.required?' *':''}
     {question.question_type==='single_choice' ? <select required={question.required} value={answers[question.id]||''} onChange={event=>setAnswers(current=>({...current,[question.id]:event.target.value}))}><option value="">اختر إجابة</option>{question.options.map(option=><option key={option} value={option}>{option}</option>)}</select>
     : question.question_type==='yes_no' ? <select required={question.required} value={answers[question.id]||''} onChange={event=>setAnswers(current=>({...current,[question.id]:event.target.value}))}><option value="">اختر إجابة</option><option value="yes">نعم</option><option value="no">لا</option></select>
     : <textarea required={question.required} maxLength={4000} rows={3} value={answers[question.id]||''} onChange={event=>setAnswers(current=>({...current,[question.id]:event.target.value}))}/>}
    </label>)}
    <label style={{display:'flex',alignItems:'start',gap:10}}><input type="checkbox" required checked={consent} onChange={event=>setConsent(event.target.checked)}/><span>أوافق على استخدام بياناتي وإجاباتي لمراجعة طلب القبول والتواصل بشأنه، وألتزم <Link href="/guides/rules">بقواعد الاستخدام</Link>.</span></label>
    <button type="submit" className="btn primary" disabled={!ready||loading||busy}>{busy?'جارٍ إرسال الطلب...':'إرسال طلب القبول'}</button>
   </fieldset>
   {error && <p role="alert" style={{color:'#ef9c94'}}>{error}</p>}
  </form>}
 </section>;
}
