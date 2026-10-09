'use client';

import { useEffect, useState } from 'react';

const fields = [
  { key: 'brand_tagline', label: 'الشعار النصي', type: 'text' },
  { key: 'brand_gold', label: 'اللون الذهبي (#RRGGBB)', type: 'text' },
  { key: 'home_eyebrow', label: 'عنوان تمهيدي للصفحة الرئيسية', type: 'text' },
  { key: 'home_title_primary', label: 'العنوان الرئيسي', type: 'text' },
  { key: 'home_title_accent', label: 'العنوان المميز', type: 'text' },
  { key: 'home_subtitle', label: 'وصف الصفحة الرئيسية', type: 'textarea' },
  { key: 'announcement_text', label: 'إعلان أعلى الموقع', type: 'textarea' },
  { key: 'footer_text', label: 'نص التذييل', type: 'textarea' },
  { key: 'contact_phone', label: 'هاتف التواصل', type: 'text' },
  { key: 'contact_email', label: 'بريد التواصل', type: 'email' },
  { key: 'contact_address', label: 'عنوان التواصل', type: 'text' },
] as const;

type Values = Record<string, string>;

export function SiteSettingsWorkspace() {
  const [values, setValues] = useState<Values>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/platform/site-settings', { cache: 'no-store' });
        const result = await response.json() as { settings?: Values; admin?: boolean; brandLogoUrl?: string | null; error?: string };
        if (!response.ok || !result.admin) throw new Error(result.error || 'تعذر تحميل إعدادات الإدارة.');
        setValues(result.settings ?? {});
        setLogoUrl(result.brandLogoUrl ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الإعدادات.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function uploadLogo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logoFile || logoBusy) return;
    setLogoBusy(true); setError(''); setNotice('');
    try {
      const body = new FormData();
      body.set('file', logoFile);
      const response = await fetch('/api/platform/site-settings/logo', { method: 'POST', body });
      const result = await response.json() as { logoPath?: string; logoUrl?: string; oldAssetCleanupWarning?: boolean; error?: string };
      if (!response.ok || !result.logoPath || !result.logoUrl) throw new Error(result.error || 'تعذر رفع الشعار.');
      setValues(current => ({ ...current, brand_logo_path: result.logoPath! }));
      setLogoUrl(result.logoUrl);
      setLogoFile(null);
      setNotice(result.oldAssetCleanupWarning ? 'تم تفعيل الشعار الجديد، لكن تعذر حذف الملف القديم؛ يلزم تنظيفه لاحقًا.' : 'تم رفع الشعار وتفعيله وحذف الملف السابق إن وجد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الشعار.');
    } finally { setLogoBusy(false); }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const settings = Object.fromEntries(fields.map(field => [field.key, values[field.key] ?? '']));
      const response = await fetch('/api/platform/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const result = await response.json() as { settings?: Values; error?: string };
      if (!response.ok || !result.settings) throw new Error(result.error || 'تعذر حفظ الإعدادات.');
      setValues(current => ({ ...current, ...result.settings }));
      setNotice('تم حفظ الإعدادات في قاعدة البيانات. ستنعكس على الواجهة فقط في المواضع المرتبطة بهذه المفاتيح.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ الإعدادات.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">جارٍ تحميل الإعدادات...</p>;
  return <div style={{display:'grid',gap:16,marginTop:20}}>
    <form className="card" onSubmit={uploadLogo} style={{display:'grid',gap:12}}>
      <h2>شعار الموقع</h2>
      {logoUrl && <img src={logoUrl} alt="الشعار الحالي" style={{maxWidth:220,maxHeight:100,objectFit:'contain',justifySelf:'start'}} />}
      <label>رفع شعار جديد (PNG/JPEG/WebP، حتى 2MB)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>setLogoFile(event.target.files?.[0]??null)} /></label>
      <button className="btn primary" type="submit" disabled={logoBusy||!logoFile}>{logoBusy?'جارٍ رفع الشعار...':'رفع وتفعيل الشعار'}</button>
    </form>
    <form className="card" onSubmit={save} style={{ display: 'grid', gap: 14 }}>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {fields.map(field => <label key={field.key}>{field.label}
      {field.type === 'textarea'
        ? <textarea rows={4} maxLength={field.key === 'home_subtitle' ? 1000 : field.key === 'announcement_text' ? 500 : 300} value={values[field.key] ?? ''} onChange={e => setValues(current => ({ ...current, [field.key]: e.target.value }))} />
        : <input type={field.type} maxLength={field.key === 'brand_logo_path' ? 500 : field.key === 'contact_email' ? 254 : 180} value={values[field.key] ?? ''} onChange={e => setValues(current => ({ ...current, [field.key]: e.target.value }))} />}
    </label>)}
    <button className="btn primary" type="submit" disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ إعدادات الموقع'}</button>
  </form></div>;
}
