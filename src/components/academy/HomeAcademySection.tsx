import Link from 'next/link';
import { getAcademyCatalog } from '@/lib/academy/catalog.server';
import { trainingFields } from '@/lib/academy/catalog';
import { TrainingIcon } from './TrainingIcon';
import { AcademyCourseCard } from './AcademyCourseCard';
import styles from './AcademyExperience.module.css';
export async function HomeAcademySection() {
  const { courses,settings,error } = await getAcademyCatalog();
  const featured = [...courses].sort((a,b)=>Number(b.featured)-Number(a.featured)).slice(0,3);
  return <section className={styles.home} aria-labelledby="home-academy-heading"><div className="wrap"><div className={styles.heading}><div><span className={styles.eyebrow}>ASLAN ACADEMY</span><h2 id="home-academy-heading">مهارة جديدة. فرص أوسع.</h2><p>استكشف مجالات التكوين واختر الدورة التي تناسب خطوتك القادمة.</p></div><Link className="btn primary" href="/academy">ادخل إلى الأكاديمية</Link></div>
    {settings.academy_announcement_body && <p className={styles.notice}>{settings.academy_announcement_body}</p>}
    {featured.length && !error ? <div className={styles.gallery}>{featured.map(course=><AcademyCourseCard course={course} key={course.id}/>)}</div> : <div className={styles.feature}><h3>اكتشف مسارات التكوين المهني</h3><p>بوابات المجالات، تفاصيل البرامج، ومسار واضح لطلب الالتحاق.</p><Link href="/academy#courses">استعرض معرض الدورات ←</Link></div>}
    <div className={styles.homeFields}>{trainingFields.map(field=><Link key={field.id} href={'/academy?field='+field.id+'#courses'}><TrainingIcon field={field.id} size={18}/>{field.title}</Link>)}</div>
  </div></section>;
}
