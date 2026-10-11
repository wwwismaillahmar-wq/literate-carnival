'use client';

import { useCallback, useEffect, useState } from 'react';

type Activity = { id: string; activity_type: string; body: string; follow_up_at: string | null; created_at: string };
const activityLabels: Record<string, string> = {
  note: 'ملاحظة', call: 'مكالمة', email: 'بريد إلكتروني', whatsapp: 'واتساب',
  meeting: 'اجتماع', follow_up: 'متابعة', status_change: 'تغيير حالة',
};

export function LeadActivityPanel({ leadId }: { leadId: number }) {
  const [items, setItems] = useState<Activity[]>([]);
  const [activityType, setActivityType] = useState('note');
  const [body, setBody] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/crm/activities?leadId=' + leadId, { cache: 'no-store' });
    const result = await response.json() as { activities?: Activity[]; error?: string };
    if (!response.ok) throw new Error(result.error || 'تعذر تحميل سجل المتابعة.');
    setItems(result.activities ?? []);
  }, [leadId]);

  useEffect(() => {
    void load().catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل سجل المتابعة.'));
  }, [load]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/crm/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, activityType, body, followUpAt: followUpAt ? new Date(followUpAt).toISOString() : null }),
      });
      const result = await response.json() as { activity?: Activity; error?: string };
      if (!response.ok || !result.activity) throw new Error(result.error || 'تعذر حفظ النشاط.');
      setItems(current => [result.activity!, ...current]);
      setBody('');
      setFollowUpAt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ النشاط.');
    } finally {
      setBusy(false);
    }
  }

  return <details style={{ marginTop: 12 }}>
    <summary>سجل المتابعة ({items.length})</summary>
    {error && <p role="alert" className="muted">{error}</p>}
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, marginTop: 10 }}>
      <label>نوع النشاط<select value={activityType} onChange={e => setActivityType(e.target.value)}>{Object.entries(activityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>التفاصيل<textarea required minLength={1} maxLength={4000} rows={3} value={body} onChange={e => setBody(e.target.value)} /></label>
      <label>موعد متابعة اختياري<input type="datetime-local" value={followUpAt} onChange={e => setFollowUpAt(e.target.value)} /></label>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'تسجيل النشاط'}</button>
    </form>
    <div className="grid" style={{ marginTop: 12 }}>
      {items.map(item => <article className="card" key={item.id}>
        <strong>{activityLabels[item.activity_type] ?? item.activity_type}</strong>
        <p>{item.body}</p>
        {item.follow_up_at && <p className="muted">المتابعة: {new Date(item.follow_up_at).toLocaleString('ar-DZ')}</p>}
        <small className="muted">{new Date(item.created_at).toLocaleString('ar-DZ')}</small>
      </article>)}
      {!items.length && <p className="muted">لا توجد أنشطة مسجلة.</p>}
    </div>
  </details>;
}
