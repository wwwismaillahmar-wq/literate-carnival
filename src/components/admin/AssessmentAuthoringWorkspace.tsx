'use client';

import { useCallback, useEffect, useState } from 'react';

type Module = { id: string; title: string; course_id: string; status: string };
type Assessment = { id: string; module_id: string; title: string; pass_score: number; max_attempts: number; status: string };
type Question = { id: string; prompt: string; options: Array<{key:string;label:string}>; correct_option: string };

async function json<T>(response: Response): Promise<T> {
  const data = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'تعذر تنفيذ العملية.');
  return data;
}

export function AssessmentAuthoringWorkspace() {
  const [modules,setModules]=useState<Module[]>([]);
  const [assessments,setAssessments]=useState<Assessment[]>([]);
  const [selected,setSelected]=useState('');
  const [questions,setQuestions]=useState<Question[]>([]);
  const [moduleId,setModuleId]=useState('');
  const [title,setTitle]=useState('');
  const [prompt,setPrompt]=useState('');
  const [optionsText,setOptionsText]=useState('a|الخيار الأول\nb|الخيار الثاني');
  const [correct,setCorrect]=useState('a');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);

  const load=useCallback(async()=>{
    const result=await json<{modules:Module[];assessments:Assessment[]}>(await fetch('/api/academy/assessments',{cache:'no-store'}));
    setModules(result.modules);setAssessments(result.assessments);
    setModuleId(current=>current||result.modules[0]?.id||'');
    setSelected(current=>current||result.assessments[0]?.id||'');
  },[]);
  const loadQuestions=useCallback(async(id:string)=>{
    if(!id){setQuestions([]);return;}
    const result=await json<{questions:Question[]}>(await fetch('/api/academy/assessments/questions?assessmentId='+encodeURIComponent(id),{cache:'no-store'}));
    setQuestions(result.questions);
  },[]);
  useEffect(()=>{void load().catch(e=>setError(e instanceof Error?e.message:'تعذر تحميل الاختبارات.'));},[load]);
  useEffect(()=>{void loadQuestions(selected).catch(e=>setError(e instanceof Error?e.message:'تعذر تحميل الأسئلة.'));},[selected,loadQuestions]);

  async function createAssessment(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!moduleId)return;setBusy(true);setError('');setNotice('');
    try{const result=await json<{assessment:Assessment}>(await fetch('/api/academy/assessments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({moduleId,title,passScore:70,maxAttempts:5})}));setAssessments(current=>[result.assessment,...current]);setSelected(result.assessment.id);setTitle('');setNotice('تم حفظ الاختبار كمسودة.');}
    catch(e){setError(e instanceof Error?e.message:'تعذر إنشاء الاختبار.');}finally{setBusy(false);}
  }
  async function addQuestion(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!selected)return;setBusy(true);setError('');setNotice('');
    try{
      const options=optionsText.split('\n').map(line=>line.trim()).filter(Boolean).map(line=>{const split=line.indexOf('|');return split<1?{key:'',label:''}:{key:line.slice(0,split).trim(),label:line.slice(split+1).trim()};});
      const result=await json<{question:Question}>(await fetch('/api/academy/assessments/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessmentId:selected,prompt,options,correctOption:correct,sortOrder:questions.length})}));
      setQuestions(current=>[...current,result.question]);setPrompt('');setNotice('تم حفظ السؤال ومفتاح التصحيح في الخادم.');
    }catch(e){setError(e instanceof Error?e.message:'تعذر حفظ السؤال.');}finally{setBusy(false);}
  }
  async function setStatus(item:Assessment,status:string){
    setBusy(true);setError('');setNotice('');
    try{const result=await json<{assessment:Assessment}>(await fetch('/api/academy/assessments',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,status})}));setAssessments(current=>current.map(row=>row.id===item.id?result.assessment:row));setNotice(status==='published'?'تم نشر الاختبار.':'تم تحديث حالة الاختبار.');}
    catch(e){setError(e instanceof Error?e.message:'تعذر تحديث حالة الاختبار.');}finally{setBusy(false);}
  }

  return <section className="grid" style={{marginTop:20}}>
    {error&&<div className="card" role="alert">{error}</div>}{notice&&<div className="card" role="status">{notice}</div>}
    <form className="card" onSubmit={createAssessment} style={{display:'grid',gap:10}}>
      <h2>إنشاء اختبار</h2>
      <label>الوحدة<select required value={moduleId} onChange={e=>setModuleId(e.target.value)}>{modules.map(m=><option key={m.id} value={m.id}>{m.title} · {m.status}</option>)}</select></label>
      <label>عنوان الاختبار<input required minLength={2} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      <button className="btn primary" disabled={busy||!modules.length}>{busy?'جارٍ الحفظ...':'إنشاء مسودة اختبار'}</button>
    </form>
    <section className="card" style={{display:'grid',gap:10}}>
      <h2>الاختبارات</h2>
      <label>اختيار الاختبار<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">اختر اختبارًا</option>{assessments.map(a=><option key={a.id} value={a.id}>{a.title} · {a.status}</option>)}</select></label>
      {assessments.filter(a=>a.id===selected).map(item=><div key={item.id} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <span className="muted">درجة النجاح {item.pass_score}% · المحاولات {item.max_attempts}</span>
        {item.status==='draft'&&<button type="button" disabled={busy||!questions.length} onClick={()=>void setStatus(item,'published')}>نشر الاختبار</button>}
        {item.status==='published'&&<button type="button" disabled={busy} onClick={()=>void setStatus(item,'archived')}>أرشفة الاختبار</button>}
      </div>)}
      {selected&&<form onSubmit={addQuestion} style={{display:'grid',gap:10}}>
        <h3>إضافة سؤال اختياري</h3>
        <label>نص السؤال<textarea required minLength={2} maxLength={2000} rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)}/></label>
        <label>الخيارات — سطر لكل خيار بصيغة key|النص<textarea required rows={4} value={optionsText} onChange={e=>setOptionsText(e.target.value)}/></label>
        <label>مفتاح الخيار الصحيح<input required maxLength={80} value={correct} onChange={e=>setCorrect(e.target.value)}/></label>
        <button className="btn primary" disabled={busy||assessments.find(a=>a.id===selected)?.status!=='draft'}>{busy?'جارٍ الحفظ...':'حفظ السؤال'}</button>
      </form>}
      <div className="grid">{questions.map((q,index)=><article className="card" key={q.id}><strong>{index+1}. {q.prompt}</strong><ul>{q.options.map(o=><li key={o.key}>{o.key}: {o.label}{o.key===q.correct_option?' ✓':''}</li>)}</ul></article>)}</div>
    </section>
  </section>;
}
