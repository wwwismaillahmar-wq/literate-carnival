import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const statusLabels: Record<string, string> = {
  submitted: 'تم الاستلام',
  under_review: 'قيد المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
  closed: 'مغلق',
};

export default async function PartnerPortalPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/partners/portal');

  const { data: applications, error } = await db.from('partner_applications')
    .select('id,organization_name,partnership_type,status,organization_id,created_at,updated_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const organizationIds = [...new Set((applications ?? [])
    .map((item) => item.organization_id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0))];
  const { data: organizations } = organizationIds.length
    ? await db.from('organizations').select('id,name,slug,status').in('id', organizationIds)
    : { data: [] as Array<{id:string;name:string;slug:string;status:string}> };
  const organizationById = new Map((organizations ?? []).map((item) => [item.id, item]));

  return <main className="section"><div className="wrap">
    <span className="kicker">PARTNERS / PRIVATE WORKSPACE</span>
    <h1>فضاء الشركاء</h1>
    <p className="muted">تابع طلباتك وحالة مراجعتها. لا يمنح إرسال الطلب صلاحيات الشريك؛ تفعيل المؤسسة يتم بعد موافقة الإدارة.</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'20px 0'}}>
      <Link className="btn primary" href="/partners">طلب شراكة جديد</Link>
      <Link className="btn" href="/account">حسابي</Link>
    </div>
    {error ? <section className="card" role="alert">
      <h2>تعذر تحميل طلباتك</h2>
      <p className="muted">لم نعرض بيانات بديلة على أنها سجلات محفوظة. حاول مجددًا لاحقًا.</p>
    </section> : !applications?.length ? <section className="card">
      <h2>لا توجد طلبات مرتبطة بهذا الحساب</h2>
      <p className="muted">الطلبات المرسلة قبل تسجيل الدخول لا تُربط تلقائيًا بالحساب. لا تعرض هذه الصفحة إلا الطلبات المرتبطة بهويتك بعد التحقق.</p>
      <Link className="btn primary" href="/partners">بدء طلب شراكة</Link>
    </section> : <section style={{display:'grid',gap:14}}>
      <h2>طلباتي ({applications.length})</h2>
      {applications.map((application) => {
        const organization = application.organization_id ? organizationById.get(application.organization_id) : undefined;
        return <article className="card" key={application.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'start'}}>
            <div><span className="kicker">طلب شراكة</span><h3>{application.organization_name}</h3><p className="muted">النوع: {application.partnership_type}</p></div>
            <span className="market-category">{statusLabels[application.status] ?? application.status}</span>
          </div>
          <p className="muted">رقم الطلب: {application.id}</p>
          <p className="muted">تاريخ الإرسال: {new Date(application.created_at).toLocaleDateString('ar-DZ')}</p>
          {application.status === 'approved' && organization ? <div className="card" style={{marginTop:12}}>
            <h4>المؤسسة المفعّلة</h4>
            <p>{organization.name}</p>
            <p className="muted">حالة المؤسسة: {organization.status}</p>
            <p className="muted">معرّف المؤسسة: {organization.id}</p>
            <p className="muted">إتاحة العقود والوثائق والدفعات ستتطلب إكمال إجراءات التحقق والصلاحيات الخاصة بها.</p>
          </div> : application.status === 'approved' ? <p className="muted">تمت الموافقة، لكن تعذر تحميل بيانات المؤسسة المرتبطة من نطاق الصلاحيات الحالي.</p> : null}
        </article>;
      })}
    </section>}
  </div></main>;
}
