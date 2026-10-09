'use client';

import { useEffect, useState } from 'react';

type Question = { id: string; prompt: string; options: Array<{key:string;label:string}> };
type Assessment = { id: string; title: string; passScore: number; questions: Question[] };

export function AssessmentRunner({ assessmentId }: { assessmentId: string }) {
  const [assessment,setAssessment]=useState<Assessment|null>(null);
  const [answers,setAnswers]=useState<Record<string,string>>({});
  const [result,setResult]=useState<{score:number;passed:boolean;attempt_number:number}|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);

  useEffect(()=>{
    void (async()=>{
      try{
        const response=await fetch('/api/academy/assessments/submit?id='+encodeURIComponent(assessmentId),{cache:'no-store'});
        const data=await response.json() as {assessment?:Assessment;error?:string};
        if(!response.ok||!data.assessment)throw new Error(data.error||'تعذر تحميل الاختبار.');
        setAssessment(data.assessment);
      }catch(e){setError(e instanceof Error?e.message:'تعذر تحميل الاختبار.');}
      finally{setLoading(false);}
    })();
  },[assessmentId]);

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(!assessment||busy)return;
    if(assessment.questions.some(q=>!answers[q.id])){setError('أجب عن جميع الأسئلة أولًا.');return;}
    setBusy(true);setError('');setResult(null);
    try{
      const response=await fetch('/api/academy/assessments/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({assessmentId:assessment.id,answers})});
      const data=await response.json() as {attempt?:{score:number;passed:boolean;attempt_number:number};error?:string};
      if(!response.ok||!data.attempt)throw new Error(data.error||'تعذر تصحيح الاختبار.');
      setResult(data.attempt);
    }catch(e){setError(e instanceof Error?e.message:'تعذر تصحيح الاختبار.');}
    finally{setBusy(false);}
  }

  if(loading)return <p className="muted">جارٍ تحميل الاختبار...</p>;
  if(error&&!assessment)return <div className="card" role="alert">{error}</div>;
  if(!assessment)return null;
  return <section className="card" style={{marginTop:20}}>
    <h1>{assessment.title}</h1><p className="muted">درجة النجاح: {assessment.passScore}% · التصحيح يتم على الخادم.</p>
    {error&&<p role="alert">{error}</p>}
    {result&&<div className="card" role="status"><h2>{result.passed?'اجتزت الاختبار':'لم تبلغ درجة النجاح'}</h2><p>النتيجة: {result.score}% · المحاولة رقم {result.attempt_number}</p></div>}
    <form onSubmit={submit} style={{display:'grid',gap:16,marginTop:16}}>
      {assessment.questions.map((question,index)=><fieldset key={question.id} className="card" style={{display:'grid',gap:8}}>
        <legend>{index+1}. {question.prompt}</legend>
        {question.options.map(option=><label key={option.key} style={{display:'flex',gap:8,alignItems:'center'}}>
          <input type="radio" name={question.id} value={option.key} checked={answers[question.id]===option.key} onChange={()=>setAnswers(current=>({...current,[question.id]:option.key}))}/>
          {option.label}
        </label>)}
      </fieldset>)}
      <button className="btn primary" disabled={busy||!assessment.questions.length}>{busy?'جارٍ التصحيح...':'إرسال الإجابات'}</button>
    </form>
  </section>;
}
