import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PartnerApplicationsWorkspace } from '@/components/admin/PartnerApplicationsWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminPartnersPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isSuperAdmin !== true) redirect('/');

  return (
    <main className="section">
      <div className="wrap">
        <Link href="/admin/control">← مركز التحكم</Link>
        <span className="kicker" style={{ display: 'block', marginTop: 24 }}>PARTNERS / M36</span>
        <h1>طلبات الشراكة</h1>
        <p className="muted">طلبات محفوظة في قاعدة البيانات. تغيير الحالة والملاحظات يمر عبر API محمي ويتطلب صلاحية super_admin.</p>
        <PartnerApplicationsWorkspace />
      </div>
    </main>
  );
}
