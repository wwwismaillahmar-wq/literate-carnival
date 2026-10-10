'use client';

import { useCallback, useEffect, useState } from 'react';

type ReviewDocument = {
  id: string;
  identity_profile_id: string;
  identity_profile: { id: string; legal_name: string; country_code: string; review_status: string } | null;
  owner_id: string;
  document_type: string;
  review_status: string;
  upload_status: string;
  created_at: string;
  review_note: string;
  signed_url: string | null;
};

export function PartnerIdentityDocumentsReview() {
  const [documents, setDocuments] = useState<ReviewDocument[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/partners/identity-documents', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر تحميل الوثائق.');
      setDocuments(Array.isArray(body.documents) ? body.documents : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل الوثائق.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(documentId: string, reviewStatus: string) {
    setBusyId(documentId);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/partners/identity-documents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId, reviewStatus, reviewNote: notes[documentId] ?? '' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر حفظ قرار المراجعة.');
      setMessage('تم حفظ قرار مراجعة الوثيقة في قاعدة البيانات.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ قرار المراجعة.');
    } finally {
      setBusyId('');
    }
  }

  async function reviewProfile(profileId: string, reviewStatus: string, busyKey: string) {
    setBusyId(busyKey);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/partners/identity-documents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reviewType: 'profile', profileId, reviewStatus, reviewNote: notes[busyKey] ?? '' }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر حفظ قرار ملف الهوية.');
      setMessage('تم حفظ قرار ملف الهوية في قاعدة البيانات.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر حفظ قرار ملف الهوية.');
    } finally {
      setBusyId('');
    }
  }

  return <section className="card" style={{ marginTop: 28 }}>
    <span className="kicker">PARTNER DUE DILIGENCE / M36</span>
    <h2>مراجعة وثائق هوية الشركاء</h2>
    <p className="muted">لا يمكن اعتماد الوثيقة إلا بعد تأكيد وجود الملف في المخزن الخاص. كل قرار مراجعة يُحفظ باسم المراجع وتوقيته.</p>
    {error ? <p role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {loading ? <p className="muted">جارٍ تحميل الوثائق…</p> : documents.length === 0 ? <p className="muted">لا توجد وثائق.</p> :
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        {documents.map((document) => <article className="card" key={document.id}>
          <h3>{document.document_type}</h3>
          <p className="muted">صاحب الوثيقة: {document.owner_id}</p>
          <p className="muted">الرفع: {document.upload_status} · مراجعة الوثيقة: {document.review_status}</p>
          {document.identity_profile ? <div className="card">
            <strong>ملف الهوية: {document.identity_profile.legal_name} ({document.identity_profile.country_code})</strong>
            <p className="muted">حالة ملف الهوية: {document.identity_profile.review_status}</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn primary" type="button" disabled={busyId === document.id || document.review_status !== 'verified' || document.identity_profile.review_status === 'verified'}
                onClick={() => void reviewProfile(document.identity_profile!.id, 'verified', document.id)}>اعتماد ملف الهوية</button>
              <button className="btn" type="button" disabled={busyId === document.id}
                onClick={() => void reviewProfile(document.identity_profile!.id, 'needs_information', document.id)}>طلب استكمال الهوية</button>
              <button className="btn" type="button" disabled={busyId === document.id}
                onClick={() => void reviewProfile(document.identity_profile!.id, 'rejected', document.id)}>رفض ملف الهوية</button>
            </div>
          </div> : null}
          <p className="muted">أُنشئت: {new Date(document.created_at).toLocaleString('ar-DZ')}</p>
          {document.signed_url ? <p><a href={document.signed_url} target="_blank" rel="noreferrer">فتح الوثيقة الخاصة (رابط مؤقت)</a></p> : <p className="muted">لا يوجد ملف مرفوع ومؤكد يمكن مراجعته.</p>}
          <label>ملاحظة المراجعة
            <textarea maxLength={2000} value={notes[document.id] ?? document.review_note ?? ''}
              onChange={(event) => setNotes((current) => ({ ...current, [document.id]: event.target.value }))} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            <button className="btn primary" type="button" disabled={busyId === document.id || document.upload_status !== 'uploaded'}
              onClick={() => void review(document.id, 'verified')}>اعتماد</button>
            <button className="btn" type="button" disabled={busyId === document.id || document.upload_status !== 'uploaded'}
              onClick={() => void review(document.id, 'needs_information')}>طلب معلومات إضافية</button>
            <button className="btn" type="button" disabled={busyId === document.id || document.upload_status !== 'uploaded'}
              onClick={() => void review(document.id, 'rejected')}>رفض</button>
          </div>
        </article>)}
      </div>}
  </section>;
}
