import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcademyAuthoringWorkspace } from '@/components/admin/AcademyAuthoringWorkspace';
import { AcademyAdmissionReviewWorkspace } from '@/components/admin/AcademyAdmissionReviewWorkspace';
import { AcademyStructureWorkspace } from '@/components/admin/AcademyStructureWorkspace';
import { AcademyAdmissionQuestionWorkspace } from '@/components/admin/AcademyAdmissionQuestionWorkspace';
import { AcademyStaffWorkspace } from '@/components/admin/AcademyStaffWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminAcademyPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: manage } = await db.rpc('admin_has_permission', { required_permission: 'academy.manage' });
  const { data: publish } = await db.rpc('admin_has_permission', { required_permission: 'academy.publish' });
  if (manage !== true && publish !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>ACADEMY / M33–M34</span>
    <h1>إدارة الأكاديمية</h1>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
      <Link className="btn secondary" href="/admin/academy/students">مركز إدارة الطلاب</Link>
      <Link className="btn secondary" href="/admin/academy/assessments">إدارة الاختبارات والتقييم والشهادات</Link>
      <Link className="btn secondary" href="/academy">معاينة الأكاديمية العامة</Link>
    </div>
    <p className="muted">تجهيز البنية التشغيلية للأكاديمية: هياكل الدورات والوحدات والدروس، أدوات تأليف المحتوى والتقييم، المدارس والفروع وعروض التكوين، القبول والمدفوعات والتسجيل. يضيف المدرسون والإدارة المادة العلمية والأسئلة بعد تسليم الأدوات لهم.</p>
    <AcademyStaffWorkspace />
    <AcademyAuthoringWorkspace />
    <AcademyStructureWorkspace />
    <AcademyAdmissionQuestionWorkspace />
    <section style={{ marginTop: 40 }}>
      <h2>طلبات القبول والتأهيل</h2>
      <p className="muted">مراجعة إجابات المتقدمين وتوثيق قرار القبول. القبول لا يثبت الدفع ولا يفتح المحتوى المدفوع تلقائيًا.</p>
      <AcademyAdmissionReviewWorkspace />
    </section>
  </div></main>;
}
