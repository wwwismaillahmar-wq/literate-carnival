import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Armchair, CalendarDays, CheckCircle2, ClipboardList, Droplets, Factory, Scissors, Snowflake, Wrench, Zap } from 'lucide-react';
import { listServices } from '@/domains/services/service';
import { categoryLabel, serviceCategory, serviceRequestUrl, type AslanService } from '@/lib/services/catalog';
import styles from '@/components/services/Services.module.css';

export const dynamic = 'force-dynamic';
const icons = {
  upholstery: Armchair, 'sewing-tailoring': Scissors, electrical: Zap,
  'workshop-setup': Factory, 'refrigeration-ac': Snowflake,
  'plumbing-heating': Droplets, irrigation: Droplets,
} as const;

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({params}: Props) {
  const { slug } = await params;
  // Metadata reflects only published services; never disclose inactive catalog entries.
  try {
    const item = (await listServices() as AslanService[]).find(s => s.slug === slug);
    return item ? {title: item.name + ' — خدمات ASLAN',description:item.description.slice(0,160)} : {title:'الخدمة غير متاحة — ASLAN'};
  } catch {return {title:'خدمات ASLAN'};}
}
export default async function ServiceDetails({ params }: Props) {
  const { slug } = await params;
  const services = (await listServices()) as AslanService[];
  const item = services.find(service => service.slug === slug);
  if (!item) notFound();
  const Icon = icons[slug as keyof typeof icons] ?? Wrench;
  return <main className={styles.page}><div className={styles.wrap}>
    <nav className={styles.breadcrumbs} aria-label="تسلسل التنقل">
      <Link href="/">الرئيسية</Link> <span>›</span>
      <Link href="/services">الخدمات</Link> <span>›</span><span>{item.name}</span>
    </nav>
    <div className={styles.detail}>
      <section className={styles.detailPanel}>
        <span className={styles.eyebrow} style={{color:'#936f31'}}>ASLAN SERVICES / {categoryLabel(serviceCategory(item))}</span>
        <h1>{item.name}</h1>
        <p>{item.description}</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={serviceRequestUrl(item.slug)}>اطلب هذه الخدمة</Link>
          <Link className={styles.secondary} href="/service-requests">متابعة طلباتي</Link>
        </div>
        <p style={{fontSize:13}}>تُحدد الأسعار والمواعيد والتغطية الجغرافية بعد مراجعة تفاصيل طلبك؛ لا توجد أسعار أو آجال ثابتة معلنة لهذه الخدمة.</p>
        <h2>كيف تحصل على الخدمة؟</h2>
        <div className={styles.steps}>
          <div className={styles.step}><strong>1</strong><span>اختر هذه الخدمة وأدخل وصف العمل وموقعه وتوقيتك المفضل.</span></div>
          <div className={styles.step}><strong>2</strong><span>تراجع الإدارة الطلب وتصدر عرض سعر موضحًا تفاصيل التنفيذ.</span></div>
          <div className={styles.step}><strong>3</strong><span>راجع العرض ووافق عليه أو ارفضه من حسابك قبل تحديد الموعد.</span></div>
          <div className={styles.step}><strong>4</strong><span>تابع جدولة الخدمة ومراحل إنجازها من صفحة طلباتك.</span></div>
        </div>
      </section>
      <aside className={styles.detailAside}>
        <div className={styles.visual}><Icon size={95} aria-hidden="true"/><small>{categoryLabel(serviceCategory(item))}</small></div>
        <div className={styles.detailPanel}>
          <h2>قبل إرسال طلبك</h2>
          <p>اجمع تفاصيل العمل، المقاسات أو المعدات المعنية، والموقع والموعد المفضل؛ هذه المعلومات تساعد على إعداد عرض مناسب.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={serviceRequestUrl(item.slug)}><ClipboardList size={17}/> إرسال طلب الخدمة</Link>
            <Link className={styles.secondary} href="/support">المساعدة</Link>
          </div>
        </div>
      </aside>
    </div>
    <section className={styles.trust} aria-label="خطوات الخدمة">
      <article><ClipboardList size={24}/><span>طلب واضح قابل للمتابعة</span></article>
      <article><CheckCircle2 size={24}/><span>عرض سعر قبل الاتفاق</span></article>
      <article><CalendarDays size={24}/><span>تحديد موعد بعد القبول</span></article>
    </section>
  </div></main>;
}
