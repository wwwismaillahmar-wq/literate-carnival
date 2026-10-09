import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_APPLICATIONS } from '../applications';

export const dynamic = 'force-dynamic';

const statusLabel = {
  active: 'مفعّل',
  partial: 'جزئي',
  boundary: 'حد معماري فقط',
  planned: 'مخطط',
} as const;

export default async function AdminApplications() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isSuperAdmin !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ADMIN / APPLICATION REGISTRY</span><h1>تطبيقات ووحدات ASLAN</h1><p className="muted">سجل ثابت داخل المستودع. لا يوجد تنفيذ JavaScript ديناميكي أو تحميل إضافات غير موثوقة.</p></div>
      <Link className="card" href="/admin/control">مركز التحكم</Link>
    </div>
    <div className="grid three" style={{marginTop:24}}>
      {ADMIN_APPLICATIONS.map(app => <article className="card" key={app.id}>
        <span className="kicker">{app.id}</span><h2>{app.name}</h2><p className="muted">{app.description}</p>
        <p><strong>الحالة:</strong> {statusLabel[app.status]}</p>
        <p className="muted"><strong>الصلاحيات المطلوبة:</strong> {app.requiredPermissions.join('، ') || 'لم تحدد بعد'}</p>
        {app.entryPath ? <Link className="btn secondary" href={app.entryPath}>فتح الوحدة ←</Link> : <span className="muted">لا يوجد مسار تشغيل مستقل لهذه الوحدة بعد.</span>}
      </article>)}
    </div>
  </div></main>;
}
