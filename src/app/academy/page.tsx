import { serverLocale } from '@/lib/i18n/content.server';
import { translatedTrainingFields } from '@/lib/i18n/training-fields';
import { getPortalDictionary } from '@/lib/i18n/portal-dictionary.server';
import Link from 'next/link';
import { BookOpen, Megaphone, Compass, ClipboardList, GraduationCap } from 'lucide-react';
import { getAcademyCatalog } from '@/lib/academy/catalog.server';
import { safeInternalLink, trainingFields } from '@/lib/academy/catalog';
import { AcademyCatalog } from '@/components/academy/AcademyCatalog';
import { TrainingIcon } from '@/components/academy/TrainingIcon';
import styles from '@/components/academy/AcademyExperience.module.css';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'الأكاديمية والتكوين المهني' };
export default async function AcademyPage({searchParams}:{searchParams:Promise<{field?:string}>}) {
  const t = await getPortalDictionary('academy');
  const locale = await serverLocale();
  const [{courses,settings,error},params] = await Promise.all([getAcademyCatalog(),searchParams]);
  const field = trainingFields.some(item=>item.id===params.field) ? params.field! : params.field==='general' ? 'general' : '';
  const articles = [
    { icon: Compass, title: settings.academy_article_1_title || 'كيف تختار برنامجك؟', text: settings.academy_article_1_body || 'ابدأ بالمجال الذي يناسب هدفك، ثم قارن وصف الدورات ومدتها والمنهج المنشور قبل تقديم طلب الالتحاق.' },
    { icon: ClipboardList, title: settings.academy_article_2_title || 'طلب القبول خطوة بخطوة', text: settings.academy_article_2_body || 'اختر الدورة والمدرسة أو الفرع المتاح، أكمل بياناتك وأسئلة التأهيل. تابع قرار القبول من مساحتك الدراسية قبل الدفع.' },
    { icon: GraduationCap, title: settings.academy_article_3_title || 'مساحة الطالب', text: settings.academy_article_3_body || 'بعد اعتماد التسجيل، تجد الدروس المتاحة وتقدمك والاختبارات في حسابك. تختلف متطلبات التعلم بحسب البرنامج.' },
  ];
  return <main className={styles.page}>
    <section className={styles.hero}><div className={'wrap '+styles.heroGrid}><div><span className={styles.eyebrow}>{t('heroTag')}</span><h1>{settings.academy_hero_title || t('heroTitle')}</h1><p>{settings.academy_hero_body || 'بوابتك إلى التكوين المهني والتقني. اختر مجالك، استكشف الدورات، وابنِ مسار تعلم يناسب هدفك.'}</p><div className={styles.actions}><Link className="btn primary" href="#courses">{t('explore')}</Link><Link className="btn secondary" href="/academy/join">{t('join')}</Link></div></div>
      <aside className={styles.feature}><span className={styles.featureIcon}><BookOpen size={34} aria-hidden="true"/></span><span className={styles.eyebrow} style={{marginTop:24}}>{t('pathIntro')}</span><h2>{t('clearPath')}</h2><p>تفاصيل البرنامج، اختيار الدورة، طلب القبول، ثم متابعة التسجيل والتعلم من حساب واحد.</p><Link href="/guides#academy">{t('academyGuide')}</Link></aside>
    </div></section>
    <div className="wrap">
      {settings.academy_announcement_body && <section className={styles.section}><div className={styles.notice}><Megaphone size={28} aria-hidden="true"/><div><h2>{settings.academy_announcement_title || 'إعلان الأكاديمية'}</h2><p>{settings.academy_announcement_body}</p></div></div></section>}
      <section className={styles.section} aria-labelledby="fields-heading"><div className={styles.heading}><div><span className={styles.eyebrow}>{t('fields')}</span><h2 id="fields-heading">{t('chooseField')}</h2><p>{t('fieldDescription')}</p></div></div><div className={styles.fields}>{trainingFields.map(item=><Link className={styles.field} key={item.id} href={'/academy?field='+item.id+'#courses'}><TrainingIcon field={item.id}/><strong>{translatedTrainingFields[locale]?.[item.id]?.title || item.title}</strong><small>{translatedTrainingFields[locale]?.[item.id]?.description || item.description}</small><em>{error ? 'استكشف المجال ←' : courses.filter(course=>course.field===item.id).length+' دورة منشورة ←'}</em></Link>)}</div></section>
      <AcademyCatalog key={field} courses={courses} initialField={field} error={error}/>
      {settings.academy_promo_body && <section className={styles.section}><div className={styles.feature}><span className={styles.eyebrow}>{t('fromAcademy')}</span><h2>{settings.academy_promo_title || 'تعرّف على برامجنا'}</h2><p>{settings.academy_promo_body}</p><Link className="btn primary" href={safeInternalLink(settings.academy_promo_link || '')}>{t('details')}</Link></div></section>}
      <section className={styles.section} aria-labelledby="news-heading"><div className={styles.heading}><div><span className={styles.eyebrow}>{t('yourExperience')}</span><h2 id="news-heading">{t('before')}</h2><p>معلومات تساعدك على اختيار الدورة وفهم خطوات التكوين.</p></div><Link href="/guides">{t('siteGuide')}</Link></div><div className={styles.editorial}>{articles.map(({icon:Icon,title,text},index)=><article className={styles.article} key={index}><Icon size={30} aria-hidden="true"/><h3>{title}</h3><p>{text}</p></article>)}</div></section>
      <section className={styles.section} aria-labelledby="journey-heading"><div className={styles.heading}><h2 id="journey-heading">{t('journey')}</h2></div><div className={styles.steps}>{[
        ['اختر المجال','استكشف الدورات في بوابة المجال الأقرب لهدفك.'],['راجع البرنامج','اطلع على الوصف والمدة والسعر والمنهج المتاح.'],['قدّم طلبك','اختر العرض المتاح وأجب عن أسئلة القبول من حسابك.'],['تابع مسارك','راجع القرار وتعليمات الدفع والتسجيل في مساحتك الدراسية.'],
      ].map(([title,text])=><article className={styles.step} key={title}><h3>{title}</h3><p>{text}</p></article>)}</div><div className={styles.actions}><Link href="/academy/join" className="btn primary">{t('startJoin')}</Link><Link href="/support" className="btn secondary">{t('help')}</Link></div></section>
    </div>
  </main>;
}
