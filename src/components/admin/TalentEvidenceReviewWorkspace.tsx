'use client';

import { useCallback, useEffect, useState } from 'react';

type Evidence = {
  id: string;
  profile_id: string;
  owner_id: string;
  title: string;
  evidence_type: string;
  evidence_url: string | null;
  notes: string;
  verification_status: string;
  created_at: string;
  talent_profiles?: { headline?: string; user_id?: string } | null;
};

export function TalentEvidenceReviewWorkspace() {
  const [items, setItems] = useState<Evidence[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/talent/evidence', { cache: 'no-store' });
    const result = await response.json() as { evidence?: Evidence[]; error?: string };
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل الأدلة.');
    setItems(result.evidence ?? []);
  }, []);

  useEffect(() => {
    void load().catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل الأدلة.')).finally(() => setLoading(false));
  }, [load]);

  async function review(item: Evidence, status: 'verified' | 'rejected' | 'unverified') {
    setBusyId(item.id);
    setError('');
    try {
      const response = await fetch('/api/talent/evidence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status }),
      });
      const result = await response.json() as { evidence?: { id: string; verification_status: string }; error?: string };
      if (!response.ok || !result.evidence) throw new Error(result.error || 'تعذر حفظ المراجعة.');
      setItems(current => current.map(row => row.id === item.id ? { ...row, verification_status: result.evidence!.verification_status } : row));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ المراجعة.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="muted">جارٍ تحميل الأدلة...</p>;
  return <section className="grid" style={{ marginTop: 20 }}>
    {error && <div className="card" role="alert">{error}</div>}
    {!items.length && <div className="card">لا توجد أدلة مسجلة في قائمة المراجعة.</div>}
    {items.map(item => <article className="card" key={item.id}>
      <span className="kicker">{item.evidence_type}</span>
      <h2>{item.title}</h2>
      <p className="muted">الملف: {item.talent_profiles?.headline || item.profile_id} · الحالة: {item.verification_status}</p>
      {item.notes && <p>{item.notes}</p>}
      {item.evidence_url && <p><a href={item.evidence_url} target="_blank" rel="noreferrer">فتح الدليل في تبويب جديد</a></p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button type="button" className="btn primary" disabled={busyId === item.id} onClick={() => void review(item, 'verified')}>توثيق</button>
        <button type="button" disabled={busyId === item.id} onClick={() => void review(item, 'rejected')}>رفض</button>
        {item.verification_status !== 'unverified' && <button type="button" disabled={busyId === item.id} onClick={() => void review(item, 'unverified')}>إلغاء التوثيق</button>}
      </div>
    </article>)}
  </section>;
}
