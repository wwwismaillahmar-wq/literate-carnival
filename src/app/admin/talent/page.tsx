import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TalentEvidenceReviewWorkspace } from '@/components/admin/TalentEvidenceReviewWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminTalentPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>TALENT / M35</span>
    <h1>مراجعة الأدلة المهنية</h1>
    <p className="muted">لا يتحول دليل المتدرب إلى دليل موثق إلا بقرار إداري محفوظ في قاعدة البيانات.</p>
    <TalentEvidenceReviewWorkspace />
  </div></main>;
}
