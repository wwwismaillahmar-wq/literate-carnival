'use client';

import { useState } from 'react';

const partnershipTypes = [
  { value: 'supplier', label: 'توريد' },
  { value: 'training', label: 'تكوين وتدريب' },
  { value: 'services', label: 'تنفيذ الخدمات' },
  { value: 'business', label: 'تعاون تجاري' },
  { value: 'employment', label: 'فرص عمل وكفاءات' },
  { value: 'other', label: 'نوع آخر' },
];

export function PartnerApplicationForm() {
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [partnershipType, setPartnershipType] = useState('business');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus('جارٍ حفظ طلب الشراكة...');
    try {
      const response = await fetch('/api/partners/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactName, phone, email, organizationName, partnershipType, message }),
      });
      const result = await response.json().catch(() => null) as
        | { application?: { id?: string; status?: string }; error?: string }
        | null;
      if (!response.ok || !result?.application?.id) {
        setStatus(result?.error || 'تعذر تسجيل الطلب. لم نعتبره محفوظًا.');
        return;
      }
      setStatus('تم حفظ طلب الشراكة في النظام. رقم الطلب: ' + result.application.id);
      setContactName('');
      setPhone('');
      setEmail('');
      setOrganizationName('');
      setPartnershipType('business');
      setMessage('');
    } catch {
      setStatus('تعذر الاتصال بالنظام؛ لم نتمكن من تأكيد حفظ الطلب.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 12, marginTop: 20 }} noValidate>
      <label>اسم جهة الاتصال
        <input required minLength={2} maxLength={120} value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" />
      </label>
      <label>رقم الهاتف
        <input required minLength={6} maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
      </label>
      <label>البريد الإلكتروني (اختياري)
        <input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
      </label>
      <label>اسم الشركة أو المؤسسة
        <input required minLength={2} maxLength={180} value={organizationName} onChange={e => setOrganizationName(e.target.value)} autoComplete="organization" />
      </label>
      <label>مجال الشراكة
        <select value={partnershipType} onChange={e => setPartnershipType(e.target.value)}>
          {partnershipTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </label>
      <label>تفاصيل الطلب
        <textarea required minLength={5} maxLength={4000} rows={5} value={message} onChange={e => setMessage(e.target.value)} />
      </label>
      <button className="btn primary" type="submit" disabled={submitting}>{submitting ? 'جارٍ الحفظ...' : 'إرسال طلب الشراكة'}</button>
      {status && <p role="status" aria-live="polite" className="muted">{status}</p>}
    </form>
  );
}
