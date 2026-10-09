import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  created_at: string | null;
  message_privacy: string | null;
};

type UserRole = { user_id: string; role_id: string };
type Role = { id: string; key: string; name: string };
type Membership = { user_id: string; organization_id: string; status: string };
type Organization = { id: string; name: string };

export default async function AdminUsers({ searchParams }: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = (params.q ?? '').trim().toLocaleLowerCase('ar');
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authorizationError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authorizationError || isSuperAdmin !== true) redirect('/');

  const [profilesResult, userRolesResult, rolesResult, membershipsResult, organizationsResult] = await Promise.all([
    db.from('profiles').select('id,username,full_name,created_at,message_privacy').order('created_at', { ascending: false }).limit(500),
    db.from('user_roles').select('user_id,role_id'),
    db.from('roles').select('id,key,name').order('name'),
    db.from('organization_members').select('user_id,organization_id,status'),
    db.from('organizations').select('id,name').order('name'),
  ]);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const userRoles = (userRolesResult.data ?? []) as UserRole[];
  const roles = (rolesResult.data ?? []) as Role[];
  const memberships = (membershipsResult.data ?? []) as Membership[];
  const organizations = (organizationsResult.data ?? []) as Organization[];
  const filtered = profiles.filter((profile) => {
    const text = [profile.full_name, profile.username, profile.id].filter(Boolean).join(' ').toLocaleLowerCase('ar');
    return !query || text.includes(query);
  });

  const errors = [
    profilesResult.error?.message && 'ملفات المستخدمين: ' + profilesResult.error.message,
    userRolesResult.error?.message && 'الأدوار المسندة: ' + userRolesResult.error.message,
    rolesResult.error?.message && 'الأدوار: ' + rolesResult.error.message,
    membershipsResult.error?.message && 'العضويات: ' + membershipsResult.error.message,
    organizationsResult.error?.message && 'المؤسسات: ' + organizationsResult.error.message,
  ].filter(Boolean);

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ADMIN / IDENTITY</span><h1>دليل المستخدمين</h1><p className="muted">بيانات حقيقية من profiles والأدوار والعضويات. لا يعرض هذا المسار بيانات المصادقة الخاصة ولا يمنح صلاحيات إضافية.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/control">مركز التحكم</Link><Link className="card" href="/admin/access">إدارة الأدوار والصلاحيات</Link><Link className="card" href="/admin/organizations">المؤسسات</Link></div>
    </div>
    <div className="grid three" style={{marginTop:20}}>
      <article className="card"><span className="muted">الملفات الظاهرة</span><h2>{filtered.length}</h2></article>
      <article className="card"><span className="muted">الأدوار المسندة</span><h2>{userRoles.length}</h2></article>
      <article className="card"><span className="muted">العضويات المؤسسية</span><h2>{memberships.length}</h2></article>
    </div>
    {errors.length > 0 && <section className="card" role="alert" style={{marginTop:16,border:'1px solid #c53030'}}><strong>تعذر تحميل بعض بيانات الإدارة.</strong><ul>{errors.map(error=><li key={error}>{error}</li>)}</ul></section>}
    <form method="get" className="card" style={{display:'flex',gap:10,marginTop:20,alignItems:'end',flexWrap:'wrap'}}>
      <label style={{flex:'1 1 280px'}}>البحث بالاسم أو اسم المستخدم أو المعرّف<input name="q" defaultValue={params.q ?? ''} placeholder="ابحث عن مستخدم"/></label>
      <button type="submit">بحث</button>{query && <Link className="card" href="/admin/users">مسح البحث</Link>}
    </form>
    <section style={{display:'grid',gap:12,marginTop:20}}>
      {filtered.map(profile => {
        const assigned = userRoles.filter(item => item.user_id === profile.id);
        const memberOf = memberships.filter(item => item.user_id === profile.id);
        return <article className="card" key={profile.id}>
          <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'start',flexWrap:'wrap'}}>
            <div><h3>{profile.full_name || profile.username || 'مستخدم بلا اسم'}</h3><p className="muted">@{profile.username || '—'} · {profile.id}</p><small className="muted">تاريخ إنشاء الملف: {profile.created_at ? new Date(profile.created_at).toLocaleDateString('ar-DZ') : 'غير متاح'} · خصوصية الرسائل: {profile.message_privacy || 'غير محددة'}</small></div>
            <Link className="btn secondary" href="/admin/access">إدارة الأدوار والملف</Link>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12,marginTop:14}}>
            <div><strong>الأدوار ({assigned.length})</strong><p className="muted">{assigned.map(item => roles.find(role=>role.id===item.role_id)?.name || item.role_id).join('، ') || 'لا توجد أدوار مسندة'}</p></div>
            <div><strong>المؤسسات ({memberOf.length})</strong><p className="muted">{memberOf.map(item => (organizations.find(org=>org.id===item.organization_id)?.name || item.organization_id) + ' (' + item.status + ')').join('، ') || 'لا توجد عضويات'}</p></div>
          </div>
        </article>;
      })}
      {!filtered.length && <article className="card"><p>لا توجد نتائج مطابقة للبحث.</p></article>}
    </section>
  </div></main>;
}
