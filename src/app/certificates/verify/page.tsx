import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function VerifyCertificatePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const params = await searchParams;
  const code = typeof params.code === 'string' ? params.code.trim().toUpperCase() : '';
  let result: { valid?: boolean; certificateCode?: string; issuedAt?: string; assessmentTitle?: string } | null = null;
  let error = '';
  if (code) {
    if (!/^ASL-[A-F0-9]{16}$/.test(code)) error = 'صيغة رمز الشهادة غير صحيحة.';
    else {
      const db = await createClient();
      const { data, error: lookupError } = await db.rpc('verify_academy_certificate', { p_certificate_code: code });
      if (lookupError) error = 'تعذر التحقق من الشهادة حاليًا.';
      else if (!data) error = 'لم نعثر على شهادة بهذا الرمز.';
      else result = data as typeof result;
    }
  }
  return <main className="section"><div className="wrap">
    <span className="kicker">ASLAN / CERTIFICATE VERIFICATION</span>
    <h1>التحقق من الشهادة</h1>
    <form className="card" method="get" style={{display:'grid',gap:10,maxWidth:600,marginTop:20}}>
      <label>رمز الشهادة<input name="code" required maxLength={20} pattern="ASL-[A-Fa-f0-9]{16}" defaultValue={code} placeholder="ASL-0123456789ABCDEF"/></label>
      <button className="btn primary" type="submit">التحقق</button>
    </form>
    {error&&<div className="card" role="alert" style={{marginTop:20}}>{error}</div>}
    {result?.valid&&<div className="card" role="status" style={{marginTop:20}}>
      <h2>الشهادة صحيحة في سجل ASLAN</h2>
      <p>رمز الشهادة: <strong>{result.certificateCode}</strong></p>
      <p>التقييم: {result.assessmentTitle}</p>
      <p>تاريخ الإصدار: {result.issuedAt ? new Date(result.issuedAt).toLocaleDateString('ar-DZ') : '—'}</p>
      <p className="muted">لا تعرض صفحة التحقق اسم صاحب الشهادة أو بيانات حسابه.</p>
    </div>}
    <p style={{marginTop:20}}><Link href="/academy">العودة إلى الأكاديمية ←</Link></p>
  </div></main>;
}
