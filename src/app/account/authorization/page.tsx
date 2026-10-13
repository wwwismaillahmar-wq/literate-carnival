import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { roleLabel, roleGuides, permissionLabels } from '@/lib/guides';
import { getAuthorizationContext } from '@/lib/authorization';

export default async function AuthorizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account/authorization');

  const context = await getAuthorizationContext();
  const roles = context?.globalRoles ?? [];
  const permissions = context?.permissions ?? [];
  const organizations = context?.organizations ?? [];

  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">ASLAN AUTHORIZATION</span>
        <h1>الأدوار والصلاحيات</h1>
        <p className="lead">هذه الأدوار والأذونات مرتبطة بحسابك فعليًا. راجع دليل دورك لمعرفة المهام وحدود الاستخدام.</p>

        <div className="grid three">
          <section className="card">
            <h2>الأدوار العامة</h2>
            {roles.length ? <ul>{roles.map(role => <li key={role}><Link href={'/guides/management#role-'+role}>{roleLabel(role)}</Link></li>)}</ul> : <p className="muted">لا توجد أدوار عامة.</p>}
          </section>

          <section className="card">
            <h2>الصلاحيات الفعلية</h2>
            {permissions.length ? <ul>{permissions.map(permission => <li key={permission}>{permissionLabels[permission] || permission}</li>)}</ul> : <p className="muted">لا توجد صلاحيات إدارية.</p>}
          </section>

          <section className="card">
            <h2>العضويات المؤسسية</h2>
            {organizations.length ? (
              <ul>{organizations.map(org => <li key={org.organizationId}>{org.organizationId} — {roleLabel(org.role)} — {org.status === 'active' ? 'نشطة' : 'غير نشطة'}</li>)}</ul>
            ) : <p className="muted">لا توجد عضويات مؤسسية.</p>}
          </section>
        </div>

        <section className="grid two" style={{marginTop:24,marginBottom:24}} aria-label="دليل مهام حسابي">{[...new Set([...roles,...organizations.filter(org=>org.status==='active').map(org=>org.role)])].map(key=>{const guide=roleGuides.find(item=>item.key===key);return guide ? <article className="card" key={key}><h2>{guide.name}</h2><p>{guide.mission}</p><ul>{guide.tasks.map(task=><li key={task}>{task}</li>)}</ul><p className="muted">{guide.limits}</p><Link href={'/guides/management#role-'+key}>دليل الدور ←</Link></article> : null;})}</section>
        <Link className="btn secondary" href="/account">← العودة إلى الحساب</Link>
      </div>
    </main>
  );
}
