'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type PartnerDocument = {
  id: string;
  document_type: string;
  review_status: string;
  upload_status: string;
  created_at: string;
  review_note?: string;
  signed_url: string | null;
};

const reviewLabels: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  verified: 'تم التحقق',
  rejected: 'مرفوضة',
  needs_information: 'تحتاج معلومات إضافية',
  expired: 'منتهية الصلاحية',
};
const uploadLabels: Record<string, string> = {
  pending: 'الرفع غير مؤكد',
  uploaded: 'تم رفع الملف',
  failed: 'فشل الرفع',
};

export function IdentityDocumentsWorkspace() {
  const [documents, setDocuments] = useState<PartnerDocument[]>([]);
  const [legalName, setLegalName] = useState('');
  const [countryCode, setCountryCode] = useState('DZ');
  const [documentType, setDocumentType] = useState('identity_card');
  const [issuingCountry, setIssuingCountry] = useState('Algeria');
  const [expiresAt, setExpiresAt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
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

  useEffect(() => { void loadDocuments(); }, [loadDocuments]);

  async function confirmUpload(documentId: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/partners/identity-documents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر تأكيد رفع الملف.');
      setMessage('تم التحقق من وجود الملف وتثبيت حالة الرفع في قاعدة البيانات.');
      await loadDocuments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تأكيد رفع الملف.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (!file) throw new Error('اختر ملف الهوية أولًا.');
      if (!consent) throw new Error('يجب الموافقة على معالجة بيانات الهوية لأغراض التحقق.');
      const response = await fetch('/api/partners/identity-documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          legalName, countryCode, documentType, mimeType: file.type, fileSize: file.size,
          issuingCountry, expiresAt: expiresAt || null, consent,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'تعذر إنشاء طلب رفع الوثيقة.');
      const db = createClient();
      const { error: uploadError } = await db.storage.from('aslan-private-documents')
        .uploadToSignedUrl(body.upload.path, body.upload.token, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error('تم تسجيل طلب الوثيقة لكن فشل رفع الملف: ' + uploadError.message);
      const completeResponse = await fetch('/api/partners/identity-documents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ documentId: body.document.id }),
      });
      const completeBody = await completeResponse.json();
      if (!completeResponse.ok) throw new Error(completeBody.error || 'رُفع الملف لكن تعذر تثبيت حالة اكتماله.');
      setMessage('تم رفع الوثيقة والتحقق من وجودها. ستظل خاصة إلى أن تنتهي مراجعتها.');
      setFile(null);
      setConsent(false);
      const fileInput = document.getElementById('partner-identity-file') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      await loadDocuments();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إرسال وثيقة الهوية.');
      await loadDocuments();
    } finally {
      setBusy(false);
    }
  }

  return <section className="card" style={{ marginTop: 28 }}>
    <span className="kicker">PRIVATE KYC / M36</span>
    <h2>التحقق من هوية الشريك</h2>
    <p className="muted">تُحفظ الوثائق في مخزن خاص، ولا تُنشر بروابط عامة. لا يعني رفع الوثيقة قبول الشراكة أو تفعيل صلاحياتها.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
      <label>الاسم القانوني
        <input required minLength={2} maxLength={220} value={legalName} onChange={(event) => setLegalName(event.target.value)} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
        <label>رمز البلد (ISO)
          <input required minLength={2} maxLength={3} value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase())} />
        </label>
        <label>نوع الوثيقة
          <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            <option value="identity_card">بطاقة التعريف</option>
            <option value="passport">جواز السفر</option>
            <option value="residence_permit">وثيقة الإقامة</option>
          </select>
        </label>
        <label>بلد الإصدار
          <input maxLength={100} value={issuingCountry} onChange={(event) => setIssuingCountry(event.target.value)} />
        </label>
        <label>تاريخ انتهاء الوثيقة (اختياري)
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </label>
      </div>
      <label>ملف الوثيقة (PDF أو JPEG أو PNG أو WebP، حتى 10MB)
        <input id="partner-identity-file" required type="file" accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <label style={{ display: 'flex', gap: 10, alignItems: 'start' }}>
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        أوافق على معالجة بيانات الوثيقة وحفظها بشكل خاص لمراجعة الهوية وأهلية الشراكة.
      </label>
      <button className="btn primary" type="submit" disabled={busy}>{busy ? 'جارٍ حفظ الوثيقة والتحقق من رفعها…' : 'رفع وثيقة التحقق'}</button>
    </form>
    {error ? <p role="alert" style={{ color: 'var(--danger, #b42318)', marginTop: 12 }}>{error}</p> : null}
    {message ? <p role="status" style={{ marginTop: 12 }}>{message}</p> : null}
    <div style={{ marginTop: 24 }}>
      <h3>وثائقي المحفوظة</h3>
      {loading ? <p className="muted">جارٍ تحميل الوثائق…</p> : documents.length === 0 ? <p className="muted">لا توجد وثائق محفوظة لهذا الحساب.</p> :
        <div style={{ display: 'grid', gap: 10 }}>
          {documents.map((document) => <article className="card" key={document.id}>
            <strong>{document.document_type}</strong>
            <p className="muted">الرفع: {uploadLabels[document.upload_status] ?? document.upload_status} · المراجعة: {reviewLabels[document.review_status] ?? document.review_status}</p>
            <p className="muted">تاريخ الإرسال: {new Date(document.created_at).toLocaleDateString('ar-DZ')}</p>
            {document.review_note ? <p>{document.review_note}</p> : null}
            {document.signed_url ? <a href={document.signed_url} target="_blank" rel="noreferrer">عرض نسخة خاصة مؤقتة</a> : null}
            {document.upload_status !== 'uploaded' ? <button className="btn" type="button" disabled={busy} onClick={() => void confirmUpload(document.id)}>التحقق من اكتمال الرفع</button> : null}
          </article>)}
        </div>}
    </div>
  </section>;
}
