'use client';

import { useEffect, useState } from 'react';

type Application = {
  id: string; course_id: string; applicant_name: string; applicant_email: string; applicant_phone: string;
  answers: Record<string, string>; screening_version: { questions?: { id: string; prompt: string }[] };
  status: string; review_note: string; submitted_at: string;
};
export function AcademyAdmissionReviewWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    const response = await fetch('/api/academy/admissions', { cache: 'no-store' });
    const result = await response.json() as { applications?: Application[]; error?: string };
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل طلبات القبول.');
    setItems(result.applications ?? []);
  }
  useEffect(() => {
    void load().catch(e => setError(e instanceof Error ? e.message : 'تعذر تحميل الطلبات.')).finally(() => setLoading(false));
  }, []);
  async function decide(item: Application, status: 'under_review'|'accepted'|'rejected'|'needs_information') {
    setBusyId(item.id); setError(''); setNotice('');
    try {
      const response = await fetch('/api/academy/admissions', { method: 'PATCH', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ id:item.id, status, reviewNote:notes[item.id] ?? '' }) });
      const result = await response.json() as { application?: { id:string; status:string; review_note:string; reviewed_at:string }; error?:string };
      if (!response.ok || !result.application) throw new Error(result.error || 'تعذر حفظ القرار.');
      setItems(current => current.map(row => row.id === item.id ? { ...row, ...result.application } : row));
      setNotice('تم حفظ قرار المراجعة.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر حفظ القرار.'); }
    finally { setBusyId(''); }
  }
  if (loading) return <p className="muted">جارٍ تحميل طلبات القبول...</p>;
  return <section className="grid" style={{ marginTop:24 }}>
    {error && <div className="card" role="alert">{error}</div>}
    {notice && <div className="card" role="status">{notice}</div>}
    {!items.length && <div className="card">لا توجد طلبات قبول حتى الآن.</div>}
    {items.map(item => <article className="card" key={item.id}>
      <span className="kicker">{item.status} · {new Date(item.submitted_at).toLocaleString('ar-DZ')}</span>
      <h2>{item.applicant_name}</h2>
      <p>{item.applicant_email} · {item.applicant_phone}</p>
      <p className="muted">الدورة: {item.course_id}</p>
      <details><summary>إجابات التأهيل</summary>
        {(item.screening_version?.questions ?? []).map(q => <p key={q.id}><strong>{q.prompt}</strong><br />{item.answers?.[q.id] || '—'}</p>)}
      </details>
      <label style={{ display:'grid', gap:6, marginTop:12 }}>ملاحظة المراجعة
        <textarea maxLength={4000} rows={3} value={notes[item.id] ?? item.review_note ?? ''} onChange={e=>setNotes(current=>({...current,[item.id]:e.target.value}))} />
      </label>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
        <button type="button" disabled={busyId===item.id} onClick={()=>void decide(item,'under_review')}>قيد المراجعة</button>
        <button type="button" className="btn primary" disabled={busyId===item.id} onClick={()=>void decide(item,'accepted')}>قبول</button>
        <button type="button" disabled={busyId===item.id} onClick={()=>void decide(item,'needs_information')}>طلب استكمال</button>
        <button type="button" disabled={busyId===item.id} onClick={()=>void decide(item,'rejected')}>رفض</button>
      </div>
    </article>)}
  </section>;
}
