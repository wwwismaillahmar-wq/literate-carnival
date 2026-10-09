import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminSettings() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isSuperAdmin !== true) redirect('/');

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ADMIN / SETTINGS</span><h1>إعدادات المنصة</h1><p className="muted">فهرس إعدادات الإدارة الموجودة فعليًا. لا تُخزّن هذه الصفحة إعدادات عامة في جدول غير موجود.</p></div>
      <Link className="card" href="/admin/control">مركز التحكم</Link>
    </div>
    <section className="grid two" style={{marginTop:24}}>
      <Link className="card" href="/admin/payment-settings" style={{textDecoration:'none'}}><span className="kicker">CONFIGURATION</span><h2>إعدادات بوابات الدفع</h2><p className="muted">إدارة إعدادات مزودي الدفع الموجودين، مع عدم كشف الأسرار المخزنة.</p><span>فتح الإعدادات ←</span></Link>
      <Link className="card" href="/admin/access" style={{textDecoration:'none'}}><span className="kicker">ACCESS CONTROL</span><h2>الصلاحيات</h2><p className="muted">إدارة الأدوار والصلاحيات من نموذج RBAC الموجود في قاعدة البيانات.</p><span>فتح إدارة الوصول ←</span></Link>
      <Link className="card" href="/admin/audit" style={{textDecoration:'none'}}><span className="kicker">AUDIT</span><h2>سجل التدقيق</h2><p className="muted">مراجعة العمليات الإدارية التي تم تسجيلها.</p><span>فتح السجل ←</span></Link>
      <article className="card"><span className="kicker">SYSTEM-WIDE SETTINGS</span><h2>الإعدادات العامة</h2><p className="muted">غير مفعلة ككيان عام في هذه الصفحة؛ لم يُضف تخزين جديد أو واجهة حفظ وهمية. يجب ربطها بعقد وإذن تخزين معتمدين قبل تفعيل التحرير.</p><span className="muted">الحالة: غير منفذة</span></article>
    </section>
  </div></main>;
}
