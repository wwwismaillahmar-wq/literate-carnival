import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getAcademyCatalog } from '@/lib/academy/catalog.server';
import { coursePrice, fieldTitle } from '@/lib/academy/catalog';
import { getCourseOfferings } from '@/lib/academy/offerings.server';
import { AcademyAdmissionForm } from '@/components/academy/AcademyAdmissionForm';
import { TrainingIcon } from '@/components/academy/TrainingIcon';
import styles from '@/components/academy/AcademyExperience.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'اختيار الدورة وطلب الالتحاق'};
export default async function AcademyJoinPage({searchParams}:{searchParams:Promise<{course?:string}>}) {
  const [{courses,error},params,db]=await Promise.all([getAcademyCatalog(),searchParams,createClient()]);
  const course=courses.find(item=>item.id===params.course);
  const {data:{user}}=await db.auth.getUser();
  const offers=course ? await getCourseOfferings(course.id) : null;
  const next='/academy/join'+(course?'?course='+encodeURIComponent(course.id):'');
  return <main className={'section '+styles.page}><div className="wrap"><Link href="/academy">العودة إلى الأكاديمية ←</Link><span className={styles.eyebrow} style={{marginTop:24}}>بوابة طالب التكوين</span><h1>اختر دورتك وابدأ طلب الالتحاق</h1><p className="lead">راجع تفاصيل البرنامج، اختر العرض المناسب، ثم أكمل بياناتك وأسئلة القبول.</p><ol className={styles.joinSteps} aria-label="خطوات الالتحاق"><li>١ · اختيار الدورة</li><li>٢ · البيانات والتأهيل</li><li>٣ · مراجعة القبول</li><li>٤ · الدفع واعتماد التسجيل</li></ol>
    <div className={styles.joinGrid}><aside className={styles.selection}><h2>اختيار البرنامج</h2>{error ? <p role="alert">تعذر تحميل الدورات. حاول تحديث الصفحة.</p> : courses.length ? <form action="/academy/join" method="get"><label>الدورة المطلوبة<select name="course" defaultValue={course?.id||''} key={course?.id||'empty'} required><option value="">اختر الدورة</option>{courses.map(item=><option key={item.id} value={item.id}>{item.title} — {fieldTitle(item.field)}</option>)}</select></label><button type="submit" className="btn primary" style={{marginTop:16}}>اختيار هذه الدورة</button></form> : <p>لا توجد دورات منشورة لطلب الالتحاق حاليًا.</p>}
      {course && <div className={styles.selected}><TrainingIcon field={course.field}/><p>{fieldTitle(course.field)}</p><h2>{course.title}</h2><p>{course.description}</p>{course.duration && <p>المدة: {course.duration}</p>}<p>السعر المعلن: <strong>{coursePrice(course.price)}</strong></p><Link className="btn secondary" href={'/academy/'+encodeURIComponent(course.id)}>اطلع على البرنامج الكامل</Link></div>}
      <Link href="/account/academy">متابعة طلباتي وتسجيلاتي ←</Link>
    </aside><div>
      {!course ? <section className={styles.empty}><h2>{params.course ? 'الدورة المطلوبة غير متاحة' : 'ابدأ باختيار دورتك'}</h2><p>اختر برنامجًا منشورًا لتظهر تفاصيله وخيارات طلب القبول.</p><Link href="/academy#courses">استعرض معرض الدورات</Link></section>
      : !user ? <section className={styles.selection}><h2>سجّل الدخول لإكمال الطلب</h2><p>يرتبط طلب القبول بحسابك لتستطيع متابعة القرار والتسجيل لاحقًا. ستعود إلى الدورة التي اخترتها بعد الدخول.</p><div className={styles.actions}><Link className="btn primary" href={'/login?next='+encodeURIComponent(next)}>تسجيل الدخول والمتابعة</Link><Link className="btn secondary" href={'/register?next='+encodeURIComponent(next)}>إنشاء حساب</Link></div></section>
      : offers?.error || offers?.unavailable ? <section className={styles.empty} role="alert"><h2>تعذر إتاحة طلب القبول الآن</h2><p>تواصل مع الأكاديمية للتحقق من المدرسة أو الفرع المتاح لهذا البرنامج.</p><Link href="/support">اطلب المساعدة</Link></section>
      : <AcademyAdmissionForm key={course.id} courseId={course.id} offerings={offers?.offerings ?? []}/>}
      <section className={styles.article} style={{marginTop:20}}><h3>ما الذي يحدث بعد إرسال الطلب؟</h3><p>تراجع الإدارة طلبك وقد تطلب معلومات إضافية. تقديم الطلب لا يضمن القبول ولا يثبت التسجيل النهائي. راجع قرار القبول وتعليمات الفاتورة في مساحتك الدراسية.</p><Link href="/guides/rules">قواعد الاستخدام والمعاملات ←</Link></section>
    </div></div>
  </div></main>;
}
