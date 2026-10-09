'use client';

import { useCallback, useEffect, useState } from 'react';

type Application = {
  id: string;
  contact_name: string;
  phone: string;
  email: string;
  organization_name: string;
  partnership_type: string;
  message: string;
  status: string;
  admin_note: string;
  assigned_to: string | null;
  created_at: string;
};

const statuses = [
  { value: 'submitted', label: 'مقدم' },
  { value: 'under_review', label: 'قيد المراجعة' },
  { value: 'approved', label: 'مقبول' },
  { value: 'rejected', label: 'مرفوض' },
  { value: 'closed', label: 'مغلق' },
];

export function PartnerApplicationsWorkspace() {
  const [items, setItems] = useState<Application[]>([]);
  const [admin, setAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/partners/applications', { cache: 'no-store' });
      const result = await response.json() as { applications?: Application[]; admin?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || 'تعذر تحميل طلبات الشراكة.');
      setItems(result.applications ?? []);
      setAdmin(result.admin === true);
      setNotes(Object.fromEntries((result.applications ?? []).map(item => [item.id, item.admin_note ?? ''])));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل طلبات الشراكة.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function update(item: Application, status: string) {
    setSaving(item.id);
    setError('');
    try {
      const response = await fetch('/api/partners/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, status, adminNote: notes[item.id] ?? item.admin_note }),
      });
      const result = await response.json() as { application?: { id: string; status: string; admin_note: string }; error?: string };
      if (!response.ok || !result.application) throw new Error(result.error || 'تعذر حفظ التحديث.');
      setItems(current => current.map(row => row.id === item.id ? { ...row, status: result.application!.status, admin_note: result.application!.admin_note } : row));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التحديث.');
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <p className="muted">جارٍ تحميل الطلبات...</p>;
  if (error && items.length === 0) return <div className="card" role="alert">{error}</div>;
  if (!items.length) return <div className="card"><p>لا توجد طلبات شراكة محفوظة.</p>{error && <p role="alert">{error}</p>}</div>;

  return (
    <section className="grid" style={{ marginTop: 20 }}>
      {error && <div className="card" role="alert">{error}</div>}
      {items.map(item => (
        <article className="card" key={item.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div><span className="kicker">{item.partnership_type}</span><h2>{item.organization_name}</h2></div>
            <span className="muted">{new Date(item.created_at).toLocaleString('ar-DZ')}</span>
          </div>
          <p><strong>{item.contact_name}</strong> · {item.phone}{item.email ? ' · ' + item.email : ''}</p>
          <p className="muted">{item.message}</p>
          {admin && (
            <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
              <label>الحالة
                <select value={item.status} onChange={e => void update(item, e.target.value)} disabled={saving === item.id}>
                  {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
                </select>
              </label>
              <label>ملاحظة إدارية
                <textarea rows={3} maxLength={4000} value={notes[item.id] ?? ''} onChange={e => setNotes(current => ({ ...current, [item.id]: e.target.value }))} />
              </label>
              <button type="button" className="btn primary" disabled={saving === item.id} onClick={() => void update(item, item.status)}>
                {saving === item.id ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
              </button>
            </div>
          )}
          {!admin && <p className="muted">حالة الطلب: {statuses.find(status => status.value === item.status)?.label ?? item.status}</p>}
        </article>
      ))}
    </section>
  );
}
