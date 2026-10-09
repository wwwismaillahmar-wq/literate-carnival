'use client';

import { useCallback, useEffect, useState } from 'react';

type EventRow = { id: string; event_name: string; aggregate_type: string; aggregate_id: string | null; status: string; attempts: number; available_at: string; created_at: string; processed_at: string | null; last_error: string | null };
type Summary = { pending: number; processing: number; failed: number };

export function EventsWorkspace() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending: 0, processing: 0, failed: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/events', { cache: 'no-store' });
      const result = await response.json() as { events?: EventRow[]; summary?: Summary; error?: string };
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل سجل الأحداث.');
      setEvents(result.events ?? []);
      setSummary(result.summary ?? { pending: 0, processing: 0, failed: 0 });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل الأحداث.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return <section style={{ display: 'grid', gap: 16, marginTop: 20 }}>
    <div className="grid three">
      <article className="card"><span className="kicker">PENDING</span><h2>{summary.pending}</h2></article>
      <article className="card"><span className="kicker">PROCESSING</span><h2>{summary.processing}</h2></article>
      <article className="card"><span className="kicker">FAILED</span><h2>{summary.failed}</h2></article>
    </div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <p className="muted">البيانات من طابور الأحداث الفعلي، لا من بيانات تجريبية.</p>
      <button className="btn primary" type="button" disabled={loading} onClick={() => void load()}>{loading ? 'جارٍ التحديث...' : 'تحديث السجل'}</button>
    </div>
    {error && <div className="card" role="alert">{error}</div>}
    {!loading && !error && !events.length && <div className="card">لا توجد أحداث معلقة أو قيد المعالجة أو فاشلة.</div>}
    {events.map(event => <article className="card" key={event.id}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div><span className="kicker">{event.status} · {event.attempts} محاولات</span><h3>{event.event_name}</h3></div>
        <span className="muted">{new Date(event.created_at).toLocaleString('ar-DZ')}</span>
      </div>
      <p className="muted">النوع: {event.aggregate_type} · المعرّف: {event.aggregate_id || '—'}</p>
      {event.last_error && <p role="alert">آخر خطأ: {event.last_error}</p>}
      <p className="muted">الموعد التالي: {new Date(event.available_at).toLocaleString('ar-DZ')}</p>
    </article>)}
  </section>;
}
