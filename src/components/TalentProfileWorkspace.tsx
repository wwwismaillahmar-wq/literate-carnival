'use client';

import { useEffect, useState } from 'react';

type Profile = {
  id: string;
  headline: string;
  bio: string;
  skills: string[];
  public_profile: boolean;
  review_status: string;
};

type Evidence = {
  id: string;
  title: string;
  evidence_type: string;
  evidence_url: string | null;
  notes: string;
  verification_status: string;
};

const evidenceTypes = [
  { value: 'training', label: 'تكوين' },
  { value: 'project', label: 'مشروع' },
  { value: 'experience', label: 'خبرة' },
  { value: 'certificate', label: 'شهادة' },
  { value: 'assessment', label: 'تقييم' },
];

export function TalentProfileWorkspace() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [publicProfile, setPublicProfile] = useState(false);
  const [submitForReview, setSubmitForReview] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceType, setEvidenceType] = useState('project');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/talent/profile', { cache: 'no-store' });
    const result = await response.json() as { profile?: Profile | null; evidence?: Evidence[]; error?: string };
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل الملف المهني.');
    const next = result.profile ?? null;
    setProfile(next);
    setHeadline(next?.headline ?? '');
    setBio(next?.bio ?? '');
    setSkillsText((next?.skills ?? []).join(', '));
    setPublicProfile(next?.public_profile ?? false);
    setEvidence(result.evidence ?? []);
  }

  useEffect(() => {
    void load().catch(error => setStatus(error instanceof Error ? error.message : 'تعذر تحميل الملف المهني.'));
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus('جارٍ حفظ الملف المهني...');
    try {
      const response = await fetch('/api/talent/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline, bio, publicProfile, submitForReview,
          skills: skillsText.split(',').map(value => value.trim()).filter(Boolean),
        }),
      });
      const result = await response.json() as { profile?: Profile; error?: string };
      if (!response.ok || !result.profile) throw new Error(result.error || 'تعذر حفظ الملف.');
      setProfile(result.profile);
      setStatus(submitForReview ? 'تم حفظ الملف وإرساله للمراجعة؛ لم يصبح موثقًا بعد.' : 'تم حفظ الملف كمسودة.');
      setSubmitForReview(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر حفظ الملف.');
    } finally {
      setBusy(false);
    }
  }

  async function addEvidence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      setStatus('احفظ الملف المهني أولًا قبل إضافة الأدلة.');
      return;
    }
    setBusy(true);
    setStatus('جارٍ حفظ الدليل...');
    try {
      const response = await fetch('/api/talent/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profile.id, title: evidenceTitle, evidenceType, evidenceUrl, notes: evidenceNotes }),
      });
      const result = await response.json() as { evidence?: Evidence; error?: string };
      if (!response.ok || !result.evidence) throw new Error(result.error || 'تعذر حفظ الدليل.');
      setEvidence(current => [result.evidence!, ...current]);
      setEvidenceTitle('');
      setEvidenceUrl('');
      setEvidenceNotes('');
      setStatus('تم حفظ الدليل بوصفه غير موثق؛ لا يظهر للعموم قبل مراجعته.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'تعذر حفظ الدليل.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid" style={{ marginTop: 20 }}>
      <form className="card" onSubmit={saveProfile} style={{ display: 'grid', gap: 12 }}>
        <h2>الملف المهني</h2>
        <label>العنوان المهني<input maxLength={160} value={headline} onChange={e => setHeadline(e.target.value)} placeholder="مثال: فني كهرباء صناعية" /></label>
        <label>نبذة مهنية<textarea rows={5} maxLength={4000} value={bio} onChange={e => setBio(e.target.value)} /></label>
        <label>المهارات، مفصولة بفواصل<input value={skillsText} onChange={e => setSkillsText(e.target.value)} placeholder="كهرباء صناعية، صيانة، تشخيص أعطال" /></label>
        <label><input type="checkbox" checked={publicProfile} onChange={e => setPublicProfile(e.target.checked)} /> أسمح بعرض الملف للعموم بعد التحقق من ASLAN</label>
        <label><input type="checkbox" checked={submitForReview} onChange={e => setSubmitForReview(e.target.checked)} /> إرسال الملف للمراجعة</label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الملف المهني'}</button>
        {profile && <p className="muted">الحالة: {profile.review_status === 'verified' ? 'موثق' : profile.review_status === 'pending' ? 'قيد المراجعة' : profile.review_status === 'rejected' ? 'يحتاج إلى تعديل' : 'مسودة'}</p>}
      </form>

      <form className="card" onSubmit={addEvidence} style={{ display: 'grid', gap: 12 }}>
        <h2>إضافة دليل مهني</h2>
        <label>عنوان الدليل<input required minLength={2} maxLength={180} value={evidenceTitle} onChange={e => setEvidenceTitle(e.target.value)} /></label>
        <label>نوع الدليل<select value={evidenceType} onChange={e => setEvidenceType(e.target.value)}>{evidenceTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label>رابط الدليل (اختياري)<input type="url" maxLength={2048} value={evidenceUrl} onChange={e => setEvidenceUrl(e.target.value)} placeholder="https://" /></label>
        <label>ملاحظات<textarea rows={3} maxLength={2000} value={evidenceNotes} onChange={e => setEvidenceNotes(e.target.value)} /></label>
        <button className="btn primary" type="submit" disabled={busy || !profile}>إضافة الدليل</button>
      </form>

      <section className="card">
        <h2>الأدلة المسجلة</h2>
        {!evidence.length && <p className="muted">لم تسجل أدلة مهنية بعد.</p>}
        <div className="grid">{evidence.map(item => <article key={item.id} className="card">
          <strong>{item.title}</strong><p className="muted">{evidenceTypes.find(type => type.value === item.evidence_type)?.label ?? item.evidence_type} · {item.verification_status === 'verified' ? 'موثق' : item.verification_status === 'rejected' ? 'مرفوض' : 'بانتظار التحقق'}</p>
          {item.notes && <p>{item.notes}</p>}
          {item.evidence_url && <a href={item.evidence_url} target="_blank" rel="noreferrer">فتح الدليل</a>}
        </article>)}</div>
      </section>
      {status && <p role="status" aria-live="polite" className="card">{status}</p>}
    </div>
  );
}
