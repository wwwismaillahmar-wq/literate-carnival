import Image from 'next/image';
import Link from 'next/link';
import { Clock3 } from 'lucide-react';
import { coursePrice, fieldTitle, type AcademyCourse } from '@/lib/academy/catalog';
import { TrainingIcon } from './TrainingIcon';
import styles from './AcademyExperience.module.css';
export function AcademyCourseCard({ course }: { course: AcademyCourse }) {
  return <article className={styles.course}>
    <Link className={styles.cover} href={'/academy/' + encodeURIComponent(course.id)} aria-label={'تفاصيل دورة ' + course.title}>
      {course.cover ? <Image src={course.cover} alt="" width={720} height={420} unoptimized loading="lazy" referrerPolicy="no-referrer" /> : <TrainingIcon field={course.field} size={68}/>}
      <span className={styles.coverLabel}>{fieldTitle(course.field)}</span>
    </Link>
    <div className={styles.body}><h3><Link href={'/academy/' + encodeURIComponent(course.id)}>{course.title}</Link></h3>
      <p>{course.description || 'افتح صفحة الدورة للاطلاع على البرنامج والتفاصيل المتاحة.'}</p>
      <div className={styles.meta}>{course.duration && <span><Clock3 size={14} aria-hidden="true" style={{display:'inline',verticalAlign:'middle'}}/> {course.duration}</span>}<strong>{coursePrice(course.price)}</strong></div>
      <div className={styles.cardActions}><Link className="btn secondary" href={'/academy/' + encodeURIComponent(course.id)}>تفاصيل الدورة</Link><Link className="btn primary" href={'/academy/join?course=' + encodeURIComponent(course.id)}>طلب الالتحاق</Link></div>
    </div>
  </article>;
}
