import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlatformWorkspace from './PlatformWorkspace';

export const dynamic = 'force-dynamic';

const modules = [
  { code: 'M26', title: 'البحث الموحد', detail: 'بحث المنتجات والخدمات والدورات والمحتوى وقاعدة المعرفة.', endpoint: '/api/platform/search?q=aslan' },
  { code: 'M27', title: 'الإشعارات', detail: 'صندوق إشعارات خاص بالمستخدم وحالة القراءة.', endpoint: '/api/platform/notifications' },
  { code: 'M28', title: 'الدعم والمعرفة', detail: 'قاعدة معرفة قابلة للنشر مع حفظ المقالات وأرشفتها.', endpoint: '/api/platform/knowledge' },
  { code: 'M29', title: 'التحليلات والتقارير', detail: 'تقارير محمية حسب الدور من أحداث الاستخدام المسجلة.', endpoint: '/api/platform/analytics' },
  { code: 'M30', title: 'بوابة الذكاء الاصطناعي', detail: 'مفتاح المزود يبقى على الخادم، مع حصة استخدام وسجل نتائج وفشل.', endpoint: '/api/platform/ai' },
  { code: 'M31', title: 'التوصيات', detail: 'توصيات قواعدية قابلة للتفسير مع تسجيل إصدار الخوارزمية.', endpoint: '/api/platform/recommendations' },
  { code: 'M32', title: 'مركز التحكم', detail: 'مؤشرات تشغيلية فعلية مع تمييز فشل القراءة بدل تحويله إلى صفر.', endpoint: '/api/platform/admin' },
];

export default async function PlatformControlCenter() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: isAdmin, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (error || isAdmin !== true) redirect('/');
  return <main className="section"><div className="wrap">
    <span className="kicker">ASLAN / M26–M32</span>
    <h1>مركز تشغيل المنصة</h1>
    <p className="muted">بوابة واحدة لوحدات البحث والإشعارات والدعم والمعرفة والتحليلات والذكاء الاصطناعي والتوصيات. كل مؤشر تشغيلي يجب أن يستند إلى بيانات محفوظة وصلاحيات الخادم.</p>
    <div className="grid three" style={{ marginTop: 24 }}>
      {modules.map((item) => <article className="card" key={item.code}>
        <span className="kicker">{item.code}</span><h2>{item.title}</h2><p className="muted">{item.detail}</p>
        <code style={{display:'block',overflowWrap:'anywhere',margin:'12px 0'}}>{item.endpoint}</code>
        <Link href={item.code === 'M32' ? '/api/platform/admin' : item.code === 'M29' ? '/api/platform/analytics' : item.code === 'M31' ? '/api/platform/recommendations' : item.code === 'M26' ? '/api/platform/search?q=aslan' : item.code === 'M28' ? '/api/platform/knowledge' : '/admin/platform'}>فتح واجهة الوحدة ←</Link>
      </article>)}
    </div>
    <PlatformWorkspace />
    <p style={{marginTop:24}}><Link href="/admin/control">العودة إلى الإدارة الرئيسية ←</Link></p>
  </div></main>;
}
