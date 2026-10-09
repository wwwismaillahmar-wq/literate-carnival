import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CourseLearningActions } from '@/components/academy/CourseLearningActions';

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

  const { data: modules, error: moduleError } = await db.from('academy_modules')
    .select('id,title,description,sort_order')
    .eq('course_id', String(course.id))
    .eq('status', 'published')
    .order('sort_order', { ascending: true });
  if (moduleError) {
    return <main className="section"><div className="wrap">
      <Link href="/academy">← العودة إلى الأكاديمية</Link>
      <h1>{textField(course as CourseRow, ['title', 'name', 'course_name'], 'الدورة')}</h1>
      <div className="card" role="alert">تعذر تحميل المنهج المنشور. لم نعرض محتوى غير مؤكد.</div>
    </div></main>;
  }

  const moduleIds = (modules ?? []).map(module => module.id);
  const { data: lessons, error: lessonError } = moduleIds.length
    ? await db.from('academy_lessons')
        .select('id,module_id,title,lesson_type,body,resource_url,duration_minutes,sort_order')
        .in('module_id', moduleIds).eq('status', 'published')
        .order('sort_order', { ascending: true })
    : { data: [], error: null };

  const title = textField(course as CourseRow, ['title', 'name', 'course_name'], 'الدورة');
  const description = textField(course as CourseRow, ['description', 'summary', 'details']);
  const lessonGroups = new Map<string, typeof lessons>();
  for (const module of modules ?? []) lessonGroups.set(module.id, (lessons ?? []).filter(lesson => lesson.module_id === module.id));

  return <main className="section"><div className="wrap">
    <Link href="/academy">← العودة إلى الأكاديمية</Link>
    <span className="kicker" style={{ display: 'block', marginTop: 20 }}>ACADEMY / CURRICULUM</span>
    <h1>{title}</h1>
    {description && <p className="lead">{description}</p>}
    {lessonError && <div className="card" role="alert">تعذر تحميل بعض الدروس المنشورة.</div>}
    {!modules?.length && <div className="card" style={{ marginTop: 20 }}>لم يُنشر منهج لهذه الدورة بعد.</div>}
    <section className="grid" style={{ marginTop: 24 }}>
      {(modules ?? []).map((module, index) => <article className="card" key={module.id}>
        <span className="kicker">MODULE {index + 1}</span>
        <h2>{module.title}</h2>
        {module.description && <p className="muted">{module.description}</p>}
        <ol>
          {(lessonGroups.get(module.id) ?? []).map(lesson => <li key={lesson.id} style={{ marginBottom: 16 }}>
            <strong>{lesson.title}</strong>
            <p className="muted">{lesson.lesson_type === 'video' ? 'درس فيديو' : lesson.lesson_type === 'document' ? 'مادة وثائقية' : lesson.lesson_type === 'link' ? 'رابط تعليمي' : 'درس نصي'}{lesson.duration_minutes ? ' · ' + lesson.duration_minutes + ' دقيقة' : ''}</p>
            {lesson.body && <p>{lesson.body}</p>}
            {lesson.resource_url && <a href={lesson.resource_url} target="_blank" rel="noreferrer">فتح المورد التعليمي ↗</a>}
          </li>)}
        </ol>
      </article>)}
    </section>
    <CourseLearningActions courseId={String(course.id)} lessons={(lessons ?? []).map(lesson => ({ id: lesson.id, title: lesson.title }))} />
  </div></main>;
}
