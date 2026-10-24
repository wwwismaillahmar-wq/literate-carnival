'use client';

import { useState } from 'react';
import { useAslanLanguage } from '@/components/AslanLocale';
import { partnerFormCopy, partnershipTypes } from '@/lib/i18n/partner-form';

type SubmitStatus = { kind: 'saving' | 'success' | 'failed' | 'networkError'; id?: string } | null;

export function PartnerApplicationForm() {
  const { language } = useAslanLanguage();
  const t = partnerFormCopy[language];
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [partnershipType, setPartnershipType] = useState('business');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<SubmitStatus>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setStatus({ kind: 'saving' });
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
        setStatus({ kind: 'failed' });
        return;
      }
      setStatus({ kind: 'success', id: result.application.id });
      setContactName('');
      setPhone('');
      setEmail('');
      setOrganizationName('');
      setPartnershipType('business');
      setMessage('');
    } catch {
      setStatus({ kind: 'networkError' });
    } finally {
      setSubmitting(false);
    }
  }

  const statusMessage = status?.kind === 'success'
    ? t.success + ' ' + status.id
    : status ? t[status.kind] : '';

  return (
    <form onSubmit={submit} className="card" style={{ display: 'grid', gap: 12, marginTop: 20 }} noValidate>
      <label>{t.contactName}
        <input required minLength={2} maxLength={120} value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" />
      </label>
      <label>{t.phone}
        <input required minLength={6} maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" dir="ltr" />
      </label>
      <label>{t.email}
        <input type="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" dir="ltr" />
      </label>
      <label>{t.organizationName}
        <input required minLength={2} maxLength={180} value={organizationName} onChange={e => setOrganizationName(e.target.value)} autoComplete="organization" />
      </label>
      <label>{t.partnershipType}
        <select value={partnershipType} onChange={e => setPartnershipType(e.target.value)}>
          {partnershipTypes.map(type => <option key={type} value={type}>{t.types[type]}</option>)}
        </select>
      </label>
      <label>{t.message}
        <textarea required minLength={5} maxLength={4000} rows={5} value={message} onChange={e => setMessage(e.target.value)} />
      </label>
      <button className="btn primary" type="submit" disabled={submitting}>{submitting ? t.saving : t.submit}</button>
      {status && <p role="status" aria-live="polite" className="muted">{statusMessage}</p>}
    </form>
  );
}
