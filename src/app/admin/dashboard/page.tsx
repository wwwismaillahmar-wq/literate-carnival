import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect('/admin/login');

  const { data: profile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  // M04 RBAC: the admin portal is reserved for the global super_admin role.
  const { data: isSuperAdmin, error: authorizationError } = await db.rpc(
    'has_role',
    { role_key: 'super_admin' },
  );

  if (authorizationError || !isSuperAdmin) redirect('/');

  const [{ count: products }, { count: leads }, { count: gallery }] =
    await Promise.all([
      db.from('products').select('*', { count: 'exact', head: true }),
      db.from('leads').select('*', { count: 'exact', head: true }),
      db.from('work_gallery').select('*', { count: 'exact', head: true }),
    ]);

  return (
    <main className="section">
      <div className="wrap">
        <span className="kicker">ADMIN CONTROL</span>
        <h1>لوحة إدارة ASLAN</h1>
        <LogoutButton />

        <p className="muted">
          مرحباً {profile?.full_name || user.email}
        </p>

        <div className="grid three" style={{ marginTop: 30 }}>
          <div className="card">
            <span className="kicker">PRODUCTS</span>
            <h2>{products ?? 0}</h2>
          </div>

          <div className="card">
            <span className="kicker">LEADS</span>
            <h2>{leads ?? 0}</h2>
          </div>

          <div className="card">
            <span className="kicker">GALLERY</span>
            <h2>{gallery ?? 0}</h2>
          </div>
        </div>

        <div className="card" style={{ marginTop: 25 }}>
          <h2>قاعدة آمنة جاهزة للإدارة</h2>
          <p className="muted">
            صلاحيات المنتجات والمعرض والطلبات محمية بسياسات RLS للمدير.
            واجهات CRUD ورفع الملفات تُضاف فوق هذه الطبقة دون تجاوز الحماية.
          </p>
        </div>
      </div>
    </main>
  );
}
