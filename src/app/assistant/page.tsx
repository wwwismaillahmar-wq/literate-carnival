'use client';

import { useState } from 'react';

export default function AssistantPage() {
  const [input,setInput] = useState('');
  const [feature,setFeature] = useState('assistant');
  const [result,setResult] = useState('');
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setResult('');
    try {
      const response = await fetch('/api/platform/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input,feature})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error ?? 'تعذر تنفيذ الطلب.');
      setResult(data.text ?? '');
    } catch(e) { setError(e instanceof Error ? e.message : 'تعذر تنفيذ الطلب.'); }
    finally { setBusy(false); }
  }
  return <main className="section"><div className="wrap">
    <span className="kicker">M30 / AI PLATFORM</span><h1>مساعد ASLAN</h1>
    <p className="muted">تُرسل المدخلات إلى مزود الذكاء الاصطناعي الذي تهيئه الإدارة على الخادم. لا تُرسل مفاتيح الوصول من المتصفح.</p>
    <form className="card" onSubmit={submit} style={{display:'grid',gap:14,marginTop:20}}>
      <label>نوع المهمة<select value={feature} onChange={e=>setFeature(e.target.value)}><option value="assistant">مساعد عام</option><option value="summarize">تلخيص</option><option value="classify">تصنيف</option></select></label>
      <label>النص أو السؤال<textarea value={input} onChange={e=>setInput(e.target.value)} rows={7} maxLength={12000} required placeholder="اكتب طلبك هنا"/></label>
      <button className="btn gold" type="submit" disabled={busy}>{busy?'جارٍ التنفيذ…':'تنفيذ الطلب'}</button>
    </form>
    {error&&<p className="card" role="alert">{error}</p>}
    {result&&<section className="card" style={{marginTop:20,whiteSpace:'pre-wrap',lineHeight:1.8}}><h2>النتيجة</h2>{result}</section>}
  </div></main>;
}
