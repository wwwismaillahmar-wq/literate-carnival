import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TalentEvidenceReviewWorkspace } from '@/components/admin/TalentEvidenceReviewWorkspace';
import { TalentProfileReviewWorkspace } from '@/components/admin/TalentProfileReviewWorkspace';

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
    <h1>مراجعة الكفاءات والأدلة المهنية</h1>
    <p className="muted">لا يظهر ملف في الدليل العام إلا إذا اختار صاحبه الإتاحة العامة وقررت الإدارة توثيقه. وتبقى الأدلة غير موثقة حتى تتم مراجعتها منفصلًا.</p>
    <h2 style={{ marginTop: 24 }}>ملفات الكفاءات</h2>
    <TalentProfileReviewWorkspace />
    <h2 style={{ marginTop: 32 }}>أدلة الخبرة والمشاريع والشهادات</h2>
    <TalentEvidenceReviewWorkspace />
  </div></main>;
}
