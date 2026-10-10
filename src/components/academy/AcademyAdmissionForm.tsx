'use client';

import { useEffect, useState } from 'react';

type Question = { id: string; prompt: string; question_type: 'text'|'single_choice'|'yes_no'; options: string[]; required: boolean };
export function AcademyAdmissionForm({ courseId }: { courseId: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch('/api/academy/admission-questions?courseId=' + encodeURIComponent(courseId), { cache: 'no-store' });
        const result = await response.json() as { questions?: Question[]; error?: string };
        if (!response.ok) throw new Error(result.error || 'تعذر تحميل أسئلة التأهيل.');
        if (active) setQuestions(result.questions ?? []);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'تعذر تحميل أسئلة التأهيل.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [courseId]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/academy/admissions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, name, email, phone, answers, consent }),
      });
      const result = await response.json() as { application?: { id: string }; message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'تعذر إرسال الطلب.');
      setNotice((result.message || 'تم إرسال الطلب.') + (result.application?.id ? ' رقم الطلب: ' + result.application.id : ''));
      setName(''); setEmail(''); setPhone(''); setAnswers({}); setConsent(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إرسال الطلب.'); }
    finally { setBusy(false); }
  }

  return <section className="card" style={{ marginTop: 28 }}>
    <span className="kicker">ADMISSION / SCREENING</span>
    <h2>اختبار التأهيل وطلب القبول</h2>
    <p className="muted">أرسل بياناتك وأجب عن أسئلة الدورة قبل التسجيل النهائي. الطلب لا يعني القبول، ولا يُطلب الدفع قبل صدور قرار القبول.</p>
    {loading ? <p className="muted">جارٍ تحميل أسئلة التأهيل...</p> : <form onSubmit={submit} className="grid" style={{ gap: 14 }}>
      <label>الاسم الكامل<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label>البريد الإلكتروني<input required type="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} /></label>
      <label>رقم الهاتف<input required type="tel" minLength={6} maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)} /></label>
      {!questions.length && <p className="muted">لم تضف الإدارة أسئلة مخصصة لهذه الدورة بعد. يمكنك إرسال طلب القبول، وسيبقى خاضعًا للمراجعة.</p>}
      {questions.map((q,index)=><label key={q.id} style={{ display:'grid', gap:8 }}>
        {index+1}. {q.prompt}{q.required?' *':''}
        {q.question_type==='single_choice' ? <select required={q.required} value={answers[q.id]||''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))}><option value="">اختر إجابة</option>{q.options.map(option=><option key={option} value={option}>{option}</option>)}</select>
        : q.question_type==='yes_no' ? <select required={q.required} value={answers[q.id]||''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))}><option value="">اختر</option><option value="yes">نعم</option><option value="no">لا</option></select>
        : <textarea required={q.required} maxLength={4000} rows={3} value={answers[q.id]||''} onChange={e=>setAnswers(v=>({...v,[q.id]:e.target.value}))} />}
      </label>)}
      <label style={{ display:'flex', alignItems:'flex-start', gap:10 }}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)} /> أوافق على استخدام بياناتي وإجاباتي لمراجعة طلب القبول والتواصل معي بشأنه.</label>
      <button className="btn primary" type="submit" disabled={busy}>{busy?'جارٍ إرسال الطلب...':'إرسال طلب القبول'}</button>
    </form>}
    {error && <p role="alert" style={{ color:'#d9534f', marginTop:12 }}>{error}</p>}
    {notice && <p role="status" style={{ marginTop:12 }}>{notice}</p>}
  </section>;
}
