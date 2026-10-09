import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SiteSettingsWorkspace } from '@/components/admin/SiteSettingsWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminSiteSettingsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>BRAND / M39</span>
    <h1>إعدادات هوية الموقع</h1>
    <p className="muted">تُحفظ القيم في جدول site_settings الموجود. تحرير القيمة لا يضمن ظهورها في صفحة عامة إلا إذا كانت تلك الصفحة تقرأ المفتاح؛ لن ندّعي انعكاسًا غير موصول بالكود.</p>
    <SiteSettingsWorkspace />
  </div></main>;
}
