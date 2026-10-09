import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminReports() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error: authorizationError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authorizationError || isSuperAdmin !== true) redirect('/');

  const tables = [
    { key: 'users', label: 'ملفات المستخدمين', table: 'profiles', href: '/admin/users' },
    { key: 'roles', label: 'الأدوار', table: 'roles', href: '/admin/access' },
    { key: 'permissions', label: 'الصلاحيات', table: 'permissions', href: '/admin/access' },
    { key: 'organizations', label: 'المؤسسات', table: 'organizations', href: '/admin/organizations' },
    { key: 'products', label: 'المنتجات', table: 'products', href: '/admin/products' },
    { key: 'categories', label: 'فئات السوق', table: 'categories', href: '/admin/categories' },
    { key: 'leads', label: 'العملاء المحتملون', table: 'leads', href: '/admin/market' },
    { key: 'posts', label: 'المنشورات', table: 'posts', href: '/admin/content' },
    { key: 'contributions', label: 'المساهمات', table: 'contributions', href: '/admin/content' },
    { key: 'messages', label: 'الرسائل', table: 'messages', href: '/community' },
    { key: 'services', label: 'الخدمات', table: 'services', href: '/admin/services/catalog' },
    { key: 'service_requests', label: 'طلبات الخدمة', table: 'service_requests', href: '/admin/services' },
  ] as const;

  const counts = await Promise.all(tables.map(async item => {
    const { count, error } = await db.from(item.table).select('*', { count: 'exact', head: true });
    return { ...item, count: error ? null : count, error: error?.message ?? null };
  }));
  const failures = counts.filter(item => item.error);

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ADMIN / REPORTING</span><h1>التقارير والمؤشرات</h1><p className="muted">أعداد مباشرة من الجداول الحالية، وليست بيانات تجريبية أو توقعات.</p></div>
      <Link className="card" href="/admin/control">مركز التحكم</Link>
    </div>
    {failures.length > 0 && <section className="card" role="alert" style={{marginTop:16,border:'1px solid #c53030'}}><strong>بعض المؤشرات غير متاحة.</strong><p className="muted">لا يُعرض الخطأ على أنه صفر؛ المؤشر الذي تعذر قراءته يظهر كغير متاح.</p><ul>{failures.map(item=><li key={item.key}>{item.label}: {item.error}</li>)}</ul></section>}
    <div className="grid three" style={{marginTop:24}}>
      {counts.map(item=><Link href={item.href} className="card" key={item.key} style={{textDecoration:'none'}}>
        <span className="kicker">{item.key}</span><h2>{item.count === null ? '—' : item.count}</h2><p className="muted">{item.label}</p><small>{item.error ? 'تعذر التحقق من العدد' : 'عدد السجلات الحالي'}</small>
      </Link>)}
    </div>
  </div></main>;
}
