import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CourseLearningActions } from '@/components/academy/CourseLearningActions';
import { getCourseOfferings } from '@/lib/academy/offerings.server';
import { coursePrice, fieldTitle, normalizeCourse, readPresentation } from '@/lib/academy/catalog';
import { TrainingIcon } from '@/components/academy/TrainingIcon';
import styles from '@/components/academy/AcademyExperience.module.css';

export const dynamic = 'force-dynamic';

type CourseRow = Record<string, unknown> & { id?: string | number };

function textField(row: CourseRow, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return fallback;
}

function isPublished(row: CourseRow): boolean {
  if (typeof row.published === 'boolean') return row.published;
  if (typeof row.is_published === 'boolean') return row.is_published;
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.visibility === 'string') return ['published', 'public'].includes(row.visibility.toLowerCase());
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.status === 'string') return ['published', 'active', 'public'].includes(row.status.toLowerCase());
  return false;
}

export default async function AcademyCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length > 120) notFound();
  const db = await createClient();
  const { data: course, error: courseError } = await db.from('courses').select('*').eq('id', id).maybeSingle();
  if (courseError || !course || !isPublished(course as CourseRow)) notFound();

  const {offerings,error:offeringsError,unavailable}=await getCourseOfferings(String(course.id));
  const offeringLookupError=offeringsError || unavailable;
  const {data:presentationRow}=await db.from('site_settings').select('setting_value').eq('setting_key','academy_catalog').eq('is_public',true).maybeSingle();
  const presentation=readPresentation(presentationRow?.setting_value)[String(course.id)];

  const { data: modules, error: moduleError } = await db.from('academy_modules')
    .select('id,title,description,sort_order')
    .eq('course_id', String(course.id))
    .eq('status', 'published')
    .order('sort_order', { ascending: true });

  const moduleIds = (modules ?? []).map(academyModule => academyModule.id);
  const { data: assessments, error: assessmentError } = moduleIds.length
    ? await db.from('academy_assessments').select('id,module_id,title,pass_score').in('module_id', moduleIds).eq('status', 'published').order('created_at', { ascending: true })
    : { data: [], error: null };
  type CurriculumLesson = { id:string; module_id:string; title:string; lesson_type:string; duration_minutes:number; sort_order:number; accessible:boolean };
  const {data:curriculum,error:lessonError}=await db.rpc('academy_curriculum',{p_course_id:String(course.id)});
  const lessons=(Array.isArray(curriculum)?curriculum:[]) as CurriculumLesson[];

  const summary = normalizeCourse(course as CourseRow,presentation);
  const title = textField(course as CourseRow, ['title', 'name', 'course_name'], 'الدورة');
  const description = textField(course as CourseRow, ['description', 'summary', 'details']);
  const lessonGroups = new Map<string, typeof lessons>();
  const assessmentGroups = new Map<string, typeof assessments>();
  for (const academyModule of modules ?? []) {
    lessonGroups.set(academyModule.id, (lessons ?? []).filter(lesson => lesson.module_id === academyModule.id));
    assessmentGroups.set(academyModule.id, (assessments ?? []).filter(assessment => assessment.module_id === academyModule.id));
  }

  return <main className="section"><div className="wrap">
    <Link href="/academy">← العودة إلى الأكاديمية</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 20 }}>ACADEMY / CURRICULUM</span>
    <h1>{title}</h1>
    {description && <p className="lead">{description}</p>}
    <section className={styles.courseDetail} aria-label="ملخص الدورة"><div><TrainingIcon field={summary.field}/><h2>{fieldTitle(summary.field)}</h2><p>{summary.duration ? 'المدة: '+summary.duration+' · ' : ''}السعر المعلن: {coursePrice(summary.price)}</p></div><div className={styles.actions}><Link className="btn primary" href={'/academy/join?course='+encodeURIComponent(String(course.id))}>اختيار العرض وطلب الالتحاق</Link><Link className="btn secondary" href="/account/academy">مساحتي الدراسية</Link></div></section>
    {moduleError && <p className="card" role="alert">تعذر تحميل المنهج حاليًا. يمكنك مراجعة معلومات الدورة والتواصل مع الأكاديمية.</p>}
    {lessonError && <div className="card" role="alert">تعذر تحميل بعض الدروس المنشورة.</div>}
    {assessmentError && <div className="card" role="alert">تعذر تحميل الاختبارات المنشورة.</div>}
    {!modules?.length && <div className="card" style={{ marginTop: 20 }}>لم يُنشر منهج لهذه الدورة بعد.</div>}
    <section className="grid" style={{ marginTop: 24 }}>
      {(modules ?? []).map((academyModule, index) => <article className="card" key={academyModule.id}>
        <span className="kicker">MODULE {index + 1}</span>
        <h2>{academyModule.title}</h2>
        {academyModule.description && <p className="muted">{academyModule.description}</p>}
        <ol>
          {(lessonGroups.get(academyModule.id) ?? []).map(lesson => <li key={lesson.id} style={{ marginBottom: 16 }}>
            <strong>{lesson.title}</strong>
            <p className="muted">{lesson.lesson_type === 'video' ? 'درس فيديو' : lesson.lesson_type === 'document' ? 'مادة وثائقية' : lesson.lesson_type === 'link' ? 'رابط تعليمي' : 'درس نصي'}{lesson.duration_minutes ? ' · ' + lesson.duration_minutes + ' دقيقة' : ''}</p>
            {lesson.accessible ? <Link href={'/academy/lessons/'+lesson.id}>فتح الدرس ↗</Link> : <span className="muted">الدرس مغلق حتى التسجيل وإتمام المتطلبات السابقة.</span>}
          </li>)}
        </ol>
        {(assessmentGroups.get(academyModule.id) ?? []).map(assessment => <p key={assessment.id}><Link href={'/academy/assessments/' + assessment.id}>اختبار: {assessment.title} · النجاح {assessment.pass_score}% ↗</Link></p>)}
      </article>)}
    </section>
    {offeringLookupError && <div className="card" role="alert">تعذر التحقق من المدارس والفروع المتاحة. تم تعطيل التسجيل والقبول حتى يكتمل التحقق.</div>}
    {!offeringLookupError && <CourseLearningActions courseId={String(course.id)} offerings={offerings} lessons={(lessons ?? []).map(lesson => ({ id: lesson.id, title: lesson.title, accessible: lesson.accessible }))} />}
    <p style={{marginTop:24}}><Link href="/guides#academy">دليل الطالب وخطوات الالتحاق ←</Link></p>
  </div></main>;
}
