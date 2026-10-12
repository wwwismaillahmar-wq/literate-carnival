'use client';
import { useState } from 'react';
import Link from 'next/link';
import { filterCourses, trainingFields, type AcademyCourse } from '@/lib/academy/catalog';
import { AcademyCourseCard } from './AcademyCourseCard';
import styles from './AcademyExperience.module.css';
export function AcademyCatalog({ courses, initialField = '', error = false }: { courses: AcademyCourse[]; initialField?: string; error?: boolean }) {
  const [field,setField] = useState(initialField);
  const [query,setQuery] = useState('');
  const shown = filterCourses(courses,field,query);
  return <section id="courses" className={styles.section} aria-labelledby="courses-heading">
    <div className={styles.heading}><div><span className={styles.eyebrow}>معرض البرامج</span><h2 id="courses-heading">الدورات الإلكترونية والتكوين</h2><p>استكشف البرنامج، راجع التفاصيل، ثم اختر مسار التحاقك.</p></div><Link href="/account/academy" className="btn secondary">مساحتي الدراسية</Link></div>
    <div className={styles.toolbar}><label>ابحث عن دورة<input type="search" placeholder="اسم الدورة أو المهارة التي تريد تعلمها" value={query} onChange={event=>setQuery(event.target.value)}/></label><label>مجال التكوين<select value={field} onChange={event=>setField(event.target.value)}><option value="">كل المجالات</option>{trainingFields.map(item=><option value={item.id} key={item.id}>{item.title}</option>)}<option value="general">تكوين مهني عام</option></select></label></div>
    {error ? <div className={styles.empty} role="alert"><h3>تعذر تحميل الدورات</h3><p>حاول تحديث الصفحة أو تواصل معنا للمساعدة.</p><Link href="/contact">تواصل مع الأكاديمية</Link></div> : <>
      <p className={styles.count} role="status" aria-live="polite">{shown.length} دورة منشورة{field ? ' في المجال المختار' : ''}</p>
      {shown.length ? <div className={styles.gallery}>{shown.map(course=><AcademyCourseCard course={course} key={course.id}/>)}</div> : <div className={styles.empty}><h3>{courses.length ? 'لا توجد دورات تطابق اختيارك' : 'الدورات ستظهر هنا عند فتح برامج التكوين'}</h3><p>{courses.length ? 'جرّب مجالًا آخر أو غيّر كلمات البحث.' : 'يمكنك استكشاف المجالات والتواصل مع الأكاديمية لمعرفة البرامج المقبلة.'}</p>{courses.length ? <button className="btn secondary" onClick={()=>{setField('');setQuery('');}}>عرض كل الدورات</button> : <Link className="btn secondary" href="/contact">استفسر عن التكوين</Link>}</div>}
    </>}
  </section>;
}
