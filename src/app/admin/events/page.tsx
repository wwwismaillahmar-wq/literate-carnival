import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EventsWorkspace } from '@/components/admin/EventsWorkspace';

export const dynamic = 'force-dynamic';

export default async function AdminEventsPage() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: allowed, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || allowed !== true) redirect('/');
  return <main className="section"><div className="wrap">
    <Link href="/admin/control">← مركز التحكم</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 24 }}>M42 / EVENT RECOVERY</span>
    <h1>مراقبة المهام والأحداث</h1>
    <p className="muted">تعرض هذه الصفحة الحالات المخزنة في طابور الأحداث. لا تنفذ إعادة المحاولة تلقائيًا ولا تزعم أن العامل يعمل؛ ظهور السجل يعتمد على توفر مخطط M08.</p>
    <EventsWorkspace />
  </div></main>;
}
