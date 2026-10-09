import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import LogoutButton from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

const areas = [
  { href: '/admin/partners', title: 'طلبات الشراكة', eyebrow: 'PARTNERS / M36', description: 'مراجعة طلبات الشراكة المحفوظة وتحديث حالتها وملاحظاتها الإدارية.' },
  { href: '/admin/platform', title: 'مركز تشغيل M26–M32', eyebrow: 'PLATFORM / M26–M32', description: 'البحث الموحد، صندوق الإشعارات، قاعدة المعرفة، التقارير، بوابة الذكاء الاصطناعي، التوصيات ومؤشرات التشغيل.' },
  { href: '/admin/products', title: 'المنتجات', eyebrow: 'MARKET / PRODUCTS', description: 'إنشاء المنتجات وتعديلها وحفظها ونشرها وإدارة صورها وفيديوهاتها.' },
  { href: '/admin/categories', title: 'فئات السوق', eyebrow: 'MARKET / CATEGORIES', description: 'إنشاء الفئات وتعديلها وحذفها ومراجعة ارتباطها بالمنتجات.' },
  { href: '/admin/market', title: 'السوق والعملاء', eyebrow: 'MARKET / LEADS', description: 'متابعة طلبات الاهتمام والعملاء المحتملين وحالة التواصل ومؤشرات الكتالوج.' },
  { href: '/admin/services/catalog', title: 'كتالوج الخدمات', eyebrow: 'SERVICES / CATALOG', description: 'إنشاء الخدمات وتعديلها ونشرها وإيقافها.' },
  { href: '/admin/services', title: 'تشغيل الخدمات', eyebrow: 'SERVICES / WORKFLOW', description: 'طلبات الخدمات وعروض الأسعار والمواعيد وتغييرات الحالة.' },
  { href: '/admin/company', title: 'الشركة والمحتوى العام', eyebrow: 'COMPANY', description: 'إدارة محتوى عن الشركة والرؤية والرسالة والأنشطة والمشاريع والأخبار.' },
  { href: '/admin/content', title: 'المحتوى والمجتمع', eyebrow: 'CONTENT / COMMUNITY', description: 'إدارة حالة المنشورات والمساهمات وتمييز المحتوى ومتابعة ما يظهر في المجتمع.' },
  { href: '/admin/inventory', title: 'المخزون', eyebrow: 'INVENTORY', description: 'كميات المخزون والحركات والحجز.' },
  { href: '/admin/fulfillment', title: 'التنفيذ والتسليم', eyebrow: 'FULFILLMENT', description: 'مهام التنفيذ وحالاتها ومراجع التتبع.' },
  { href: '/admin/payments', title: 'الفوترة والمدفوعات', eyebrow: 'BILLING / PAYMENTS', description: 'متابعة الفواتير والمدفوعات ضمن الوظائف المنفذة حاليًا.' },
  { href: '/admin/audit', title: 'سجل التدقيق', eyebrow: 'AUDIT / SECURITY', description: 'مراجعة العمليات الإدارية المسجلة.' },
  { href: '/admin/users', title: 'دليل المستخدمين', eyebrow: 'IDENTITY / USERS', description: 'عرض ملفات المستخدمين والأدوار المسندة والعضويات المؤسسية من البيانات الحالية.' },
  { href: '/admin/access', title: 'الأدوار والصلاحيات', eyebrow: 'IDENTITY / RBAC', description: 'إدارة الأدوار والصلاحيات وتعيينها للمستخدمين والتحكم في ملفاتهم.' },
  { href: '/admin/reports', title: 'التقارير والمؤشرات', eyebrow: 'REPORTING', description: 'أعداد فعلية من الجداول الحالية مع إظهار الأخطاء بدل إخفائها كأصفار.' },
  { href: '/admin/settings', title: 'إعدادات المنصة', eyebrow: 'SETTINGS', description: 'مدخل موحد لإعدادات الدفع والصلاحيات وسجل التدقيق الموجودة فعليًا.' },
  { href: '/admin/applications', title: 'التطبيقات والوحدات', eyebrow: 'APPLICATION REGISTRY', description: 'سجل الوحدات الحالية والمستقبلية وحالة تفعيلها ومساراتها.' },
  { href: '/admin/organizations', title: 'المؤسسات والعضويات', eyebrow: 'ORGANIZATIONS', description: 'إنشاء المؤسسات وإدارة الأعضاء وأدوارهم داخل كل مؤسسة.' },
  { href: '/admin/payment-settings', title: 'إعدادات بوابات الدفع', eyebrow: 'PAYMENT CONFIGURATION', description: 'إدارة إعدادات التاجر ومفاتيح الدفع دون كشف الأسرار المخزنة.' },
];

export default async function AdminControl({ searchParams }: { searchParams?: Promise<{ success?: string; error?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isSuperAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isSuperAdmin !== true) redirect('/');

  const [
    { count: products, error: productsError },
    { count: leads, error: leadsError },
    { count: services, error: servicesError },
    { count: requests, error: requestsError },
  ] = await Promise.all([
    db.from('products').select('*', { count: 'exact', head: true }),
    db.from('leads').select('*', { count: 'exact', head: true }),
    db.from('services').select('*', { count: 'exact', head: true }),
    db.from('service_requests').select('*', { count: 'exact', head: true }),
  ]);
  const metrics = [
    { label: 'المنتجات', value: products, error: productsError },
    { label: 'العملاء المحتملون', value: leads, error: leadsError },
    { label: 'الخدمات', value: services, error: servicesError },
    { label: 'طلبات الخدمة', value: requests, error: requestsError },
  ];

  return <main className="section"><div className="wrap">
    <div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}>
      <div><span className="kicker">ASLAN / SUPER ADMIN</span><h1>بوابة الإدارة</h1><p className="muted">اختر المجال لإدارة عملياته في صفحة مستقلة. لا تُعدّ الواجهة أو الزر وظيفة مكتملة إلا عندما تعمل العملية فعليًا.</p></div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><Link className="card" href="/admin/dashboard">لوحة المؤشرات</Link><Link className="card" href="/" target="_blank">معاينة الموقع</Link><LogoutButton /></div>
    </div>
    {params.success && <div className="card" style={{marginTop:16,border:'1px solid #2f855a'}}><strong>✓ {params.success}</strong></div>}
    {params.error && <div className="card" style={{marginTop:16,border:'1px solid #c53030'}}><strong>✕ {params.error}</strong></div>}
    <div className="grid four" style={{marginTop:24}}>
      {metrics.map((metric)=><article className="card" key={metric.label}><span className="muted">{metric.label}</span><h2>{metric.error ? '—' : metric.value ?? 0}</h2>{metric.error && <small role="alert" className="muted">تعذر تحميل المؤشر: {metric.error.message}</small>}</article>)}
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
