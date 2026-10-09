import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

const areas = [
  { href: '/admin/products', title: 'المنتجات', eyebrow: 'MARKET / PRODUCTS', description: 'إنشاء المنتجات وتعديلها وحفظها ونشرها وإدارة صورها وفيديوهاتها.' },
  { href: '/admin/market', title: 'السوق والعملاء', eyebrow: 'MARKET / LEADS', description: 'متابعة طلبات الاهتمام والعملاء المحتملين وحالة التواصل ومؤشرات الكتالوج.' },
  { href: '/admin/services', title: 'تشغيل الخدمات', eyebrow: 'SERVICES / WORKFLOW', description: 'طلبات الخدمات وعروض الأسعار والمواعيد وتغييرات الحالة.' },
  { href: '/admin/company', title: 'الشركة والمحتوى العام', eyebrow: 'COMPANY', description: 'إدارة محتوى عن الشركة والرؤية والرسالة والأنشطة والمشاريع والأخبار.' },
  { href: '/admin/content', title: 'المحتوى والمجتمع', eyebrow: 'CONTENT / COMMUNITY', description: 'إدارة المحتوى المميز الحالي ومراجعة أدوات المحتوى الإضافية من المساحة الإدارية المتبقية.' },
  { href: '/admin/inventory', title: 'المخزون', eyebrow: 'INVENTORY', description: 'كميات المخزون والحركات والحجز.' },
  { href: '/admin/fulfillment', title: 'التنفيذ والتسليم', eyebrow: 'FULFILLMENT', description: 'مهام التنفيذ وحالاتها ومراجع التتبع.' },
  { href: '/admin/payments', title: 'الفوترة والمدفوعات', eyebrow: 'BILLING / PAYMENTS', description: 'متابعة الفواتير والمدفوعات ضمن الوظائف المنفذة حاليًا.' },
  { href: '/admin/audit', title: 'سجل التدقيق', eyebrow: 'AUDIT / SECURITY', description: 'مراجعة العمليات الإدارية المسجلة.' },
  { href: '/admin/legacy', title: 'إدارة المستخدمين والصلاحيات والمؤسسات', eyebrow: 'IDENTITY / RBAC', description: 'الأدوار والصلاحيات والمستخدمون والمؤسسات والعضويات والعمليات الإدارية المتبقية التي لم تُنقل بعد إلى صفحات مستقلة.' },
];

export default async function AdminControl({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isSuperAdmin !== true) redirect('/');

  const [{ count: products }, { count: leads }, { count: services }, { count: requests }] = await Promise.all([
    db.from('products').select('*', { count: 'exact', head: true }),
    db.from('leads').select('*', { count: 'exact', head: true }),
    db.from('services').select('*', { count: 'exact', head: true }),
    db.from('service_requests').select('*', { count: 'exact', head: true }),
  ]);

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ASLAN / SUPER ADMIN</span><h1>بوابة الإدارة</h1><p className="muted">اختر المجال لإدارة عملياته في صفحة مستقلة. لا تُعدّ الواجهة أو الزر وظيفة مكتملة إلا عندما تعمل العملية فعليًا.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/dashboard">لوحة المؤشرات</Link><Link className="card" href="/" target="_blank">معاينة الموقع</Link><LogoutButton /></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    <div className="grid four" style={{marginTop:24}}>
      {[['المنتجات',products],['العملاء المحتملون',leads],['الخدمات',services],['طلبات الخدمة',requests]].map(([label,value])=><article className="card" key={String(label)}><span className="muted">{label}</span><h2>{value ?? 0}</h2></article>)}
    </div>
    <section style={{marginTop:28}}><h2>أبواب الإدارة</h2><div className="grid three" style={{marginTop:16}}>
      {areas.map((area)=><Link href={area.href} className="card" key={area.href} style={{textDecoration:'none',display:'block'}}>
        <span className="kicker">{area.eyebrow}</span><h3>{area.title}</h3><p className="muted">{area.description}</p><span>فتح الإدارة ←</span>
      </Link>)}
    </div></section>
    <section className="card" style={{marginTop:24}}>
      <h2>حدود التفعيل الحالية</h2>
      <p className="muted">هذه البوابة تعرض المجالات التي لها صفحات أو بيانات فعلية ضمن M00–M17. إدارة الدورات بوصفها LMS متكاملًا، وبوابة الشركاء المتكاملة، وإدارة موسوعات مستقلة لا تُعرض هنا على أنها وظائف جاهزة ما لم تكن عملياتها وقاعدة بياناتها قد نُفذت واختُبرت في مراحلها المعتمدة.</p>
    </section>
  </div></main>;
}
