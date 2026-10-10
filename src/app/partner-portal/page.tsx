import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type PartnerMembershipRow = {
  organization_id: string;
  role_id: string | null;
  status: string;
  created_at: string;
  organizations: { id: string; name: string; slug: string; type: string; status: string } | { id: string; name: string; slug: string; type: string; status: string }[] | null;
  roles: { key: string; name: string } | { key: string; name: string }[] | null;
};

export default async function PartnerPortalPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/partner-portal');
  const { data: memberships, error } = await db.from('organization_members')
    .select('organization_id,role_id,status,created_at,organizations(id,name,slug,type,status),roles(key,name)')
    .eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
  const partnerMemberships = ((memberships ?? []) as unknown as PartnerMembershipRow[]).filter(item => {
    const org = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
    return org?.type === 'partner';
  });
  const { data: applications, error: applicationError } = await db.from('partner_applications')
    .select('id,organization_name,partnership_type,status,organization_id,created_at,updated_at')
    .eq('owner_id', user.id).order('created_at', { ascending: false }).limit(50);

  return <main className="section"><div className="wrap">
    <span className="kicker">ASLAN / PARTNER PORTAL</span>
    <h1>بوابة الشريك</h1>
    <p className="muted">تعرض المؤسسات التي أنت عضو فيها وطلبات الشراكة المرتبطة بحسابك. لا تمنح الصفحة صلاحيات إضافية؛ تظل العضوية وRLS هما مصدر التفويض.</p>
    {error && <div className="card" role="alert">تعذر تحميل عضويات المؤسسات.</div>}
    {!error && !partnerMemberships.length && <div className="card">لا توجد مؤسسة شريكة مفعلة لهذا الحساب حتى الآن. يمكنك تقديم طلب شراكة، ثم تُنشأ المؤسسة عند الموافقة على طلب مرتبط بحسابك.</div>}
    <section className="grid two" style={{marginTop:20}}>
      {partnerMemberships.map(item => {
        const org = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
        if (!org) return null;
        return <article className="card" key={org.id}><span className="kicker">PARTNER ORGANIZATION</span><h2>{org.name}</h2><p className="muted">/{org.slug} · {org.status}</p><p>دور العضوية: {Array.isArray(item.roles) ? item.roles[0]?.name : item.roles?.name || 'عضو'}</p></article>;
      })}
    </section>
    <h2 style={{marginTop:32}}>طلباتي</h2>
    {applicationError && <div className="card" role="alert">تعذر تحميل طلبات الشراكة.</div>}
    <section className="grid two" style={{marginTop:16}}>
      {(applications ?? []).map(item=><article className="card" key={item.id}><span className="kicker">{item.partnership_type} · {item.status}</span><h3>{item.organization_name}</h3><p className="muted">آخر تحديث: {new Date(item.updated_at).toLocaleDateString('ar-DZ')}</p>{item.organization_id&&<p>تم ربط الطلب بمؤسسة شريكة.</p>}</article>)}
      {!applicationError && !applications?.length && <div className="card">لا توجد طلبات مرتبطة بحسابك.</div>}
    </section>
    <p style={{marginTop:24}}><Link href="/partners">تقديم طلب شراكة جديد ←</Link></p>
  </div></main>;
}
