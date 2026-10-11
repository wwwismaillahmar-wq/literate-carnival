'use client';

import { useCallback, useEffect, useState } from 'react';

type EventRow = { id: string; event_name: string; aggregate_type: string; aggregate_id: string | null; status: string; attempts: number; manual_retry_count: number; available_at: string; created_at: string; processed_at: string | null; last_error: string | null };
type Summary = { pending: number; processing: number; failed: number };
type RecoveryLog = { id: string; event_id: string; actor_id: string | null; reason: string; previous_attempts: number; retry_number: number; created_at: string };

export function EventsWorkspace() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [summary, setSummary] = useState<Summary>({ pending: 0, processing: 0, failed: 0 });
  const [recoveryLogs, setRecoveryLogs] = useState<RecoveryLog[]>([]);
  const [logsUnavailable, setLogsUnavailable] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/platform/events', { cache: 'no-store' });
      const result = await response.json() as { events?: EventRow[]; summary?: Summary; recoveryLogs?: RecoveryLog[] | null; recoveryLogsUnavailable?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل سجل الأحداث.');
      setEvents(result.events ?? []);
      setSummary(result.summary ?? { pending: 0, processing: 0, failed: 0 });
      setRecoveryLogs(result.recoveryLogs ?? []);
      setLogsUnavailable(result.recoveryLogsUnavailable === true);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل سجل الأحداث.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function retry(event: EventRow) {
    const reason = (reasons[event.id] ?? '').trim();
    if (reason.length < 5 || busyId) { setError('اكتب سببًا من 5 أحرف على الأقل قبل إعادة المحاولة.'); return; }
    setBusyId(event.id); setError('');
    try {
      const response = await fetch('/api/platform/events', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: event.id, reason }),
      });
      const result = await response.json() as { event?: EventRow; error?: string };
      if (!response.ok || !result.event) throw new Error(result.error || 'تعذرت إعادة جدولة الحدث.');
      setReasons(current => ({ ...current, [event.id]: '' }));
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذرت إعادة المحاولة.'); }
    finally { setBusyId(null); }
  }

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
      {logsUnavailable && <p className="muted">تعذر تحميل سجل أسباب إعادة المحاولة.</p>}
      {recoveryLogs.filter(log => log.event_id === event.id).map(log => <div className="card" key={log.id}><strong>إعادة المحاولة اليدوية #{log.retry_number}</strong><p>{log.reason}</p><small className="muted">المحاولات السابقة: {log.previous_attempts} · {new Date(log.created_at).toLocaleString('ar-DZ')}</small></div>)}
      {event.status === 'failed' && <div style={{display:'grid',gap:8,marginTop:12}}>
        <p className="muted">إعادات المحاولة اليدوية: {event.manual_retry_count}/3</p>
        <label>سبب إعادة المحاولة<input minLength={5} maxLength={1000} value={reasons[event.id] ?? ''} onChange={e => setReasons(current => ({...current,[event.id]:e.target.value}))} placeholder="اذكر ما الذي تم إصلاحه" /></label>
        <button type="button" className="btn primary" disabled={busyId !== null || event.manual_retry_count >= 3} onClick={() => void retry(event)}>{busyId === event.id ? 'جارٍ إعادة الجدولة...' : 'إعادة الجدولة مع تسجيل السبب'}</button>
      </div>}
    </article>)}
  </section>;
}
