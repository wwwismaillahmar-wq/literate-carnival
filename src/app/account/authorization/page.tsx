import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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
        <p className="lead">عرض مختصر لسياق التفويض الفعلي للحساب الحالي. هذه ليست لوحة إدارة.</p>

        <div className="grid three">
          <section className="card">
            <h2>الأدوار العامة</h2>
            {roles.length ? <ul>{roles.map(role => <li key={role}>{role}</li>)}</ul> : <p className="muted">لا توجد أدوار عامة.</p>}
          </section>

          <section className="card">
            <h2>الصلاحيات الفعلية</h2>
            {permissions.length ? <ul>{permissions.map(permission => <li key={permission}>{permission}</li>)}</ul> : <p className="muted">لا توجد صلاحيات إدارية.</p>}
          </section>

          <section className="card">
            <h2>Organizations</h2>
            {organizations.length ? (
              <ul>{organizations.map(org => <li key={org.organizationId}>{org.organizationId} — {org.role} — {org.status}</li>)}</ul>
            ) : <p className="muted">لا توجد عضويات Organization.</p>}
          </section>
        </div>

        <Link className="btn secondary" href="/account">← العودة إلى الحساب</Link>
      </div>
    </main>
  );
}
