import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AssessmentAuthoringWorkspace } from '@/components/admin/AssessmentAuthoringWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminAssessmentsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');
  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{display:'block',marginTop:24}}>ACADEMY / M34</span>
    <h1>إدارة الاختبارات والتقييم</h1>
    <p className="muted">تُحفظ الإجابات الصحيحة على الخادم ولا تُرسل إلى الواجهة العامة. النشر متاح بعد إضافة سؤال واحد على الأقل.</p>
    <AssessmentAuthoringWorkspace />
  </div></main>;
}
