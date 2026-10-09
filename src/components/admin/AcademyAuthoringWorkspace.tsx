'use client';

import { useCallback, useEffect, useState } from 'react';

type Course = { id: string; title: string; description: string; status: string };
type Module = { id: string; course_id: string; title: string; description: string; sort_order: number; status: string };
type Lesson = { id: string; module_id: string; title: string; lesson_type: string; body: string; resource_url: string | null; duration_minutes: number; sort_order: number; status: string };

async function readJson<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ العملية.');
  return result;
}

export function AcademyAuthoringWorkspace() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [moduleId, setModuleId] = useState('');
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState('text');
  const [lessonBody, setLessonBody] = useState('');
  const [lessonUrl, setLessonUrl] = useState('');
  const [lessonDuration, setLessonDuration] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadCourses = useCallback(async () => {
    const result = await readJson<{ courses: Course[] }>(await fetch('/api/academy/courses', { cache: 'no-store' }));
    setCourses(result.courses);
    setCourseId(current => current || result.courses[0]?.id || '');
  }, []);

  const loadModules = useCallback(async (selectedCourseId: string) => {
    if (!selectedCourseId) { setModules([]); setModuleId(''); return; }
    const result = await readJson<{ modules: Module[] }>(await fetch('/api/academy/modules?courseId=' + encodeURIComponent(selectedCourseId), { cache: 'no-store' }));
    setModules(result.modules);
    setModuleId(current => result.modules.some(module => module.id === current) ? current : result.modules[0]?.id || '');
  }, []);

  const loadLessons = useCallback(async (selectedModuleId: string) => {
    if (!selectedModuleId) { setLessons([]); return; }
    const result = await readJson<{ lessons: Lesson[] }>(await fetch('/api/academy/lessons?moduleId=' + encodeURIComponent(selectedModuleId), { cache: 'no-store' }));
    setLessons(result.lessons);
  }, []);

  useEffect(() => { void loadCourses().catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل الدورات.')); }, [loadCourses]);
  useEffect(() => { void loadModules(courseId).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل الوحدات.')); }, [courseId, loadModules]);
  useEffect(() => { void loadLessons(moduleId).catch(err => setError(err instanceof Error ? err.message : 'تعذر تحميل الدروس.')); }, [moduleId, loadLessons]);

  async function createModule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ module: Module }>(await fetch('/api/academy/modules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, title: moduleTitle, description: moduleDescription, sortOrder: modules.length }),
      }));
      const next = [...modules, result.module];
      setModules(next); setModuleId(result.module.id); setModuleTitle(''); setModuleDescription('');
      setNotice('تم حفظ الوحدة في قاعدة البيانات.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء الوحدة.'); }
    finally { setBusy(false); }
  }

  async function saveModule(module: Module, patch: Partial<Module>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ module: Module }>(await fetch('/api/academy/modules', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: module.id, title: patch.title, description: patch.description, sortOrder: patch.sort_order, status: patch.status }),
      }));
      setModules(current => current.map(row => row.id === module.id ? { ...row, ...result.module } : row));
      setNotice('تم تحديث الوحدة.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الوحدة.'); }
    finally { setBusy(false); }
  }

  async function archiveModule(module: Module) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await readJson<{ module: { id: string; status: string } }>(await fetch('/api/academy/modules?id=' + encodeURIComponent(module.id), { method: 'DELETE' }));
      setModules(current => current.map(row => row.id === module.id ? { ...row, status: 'archived' } : row));
      setNotice('تمت أرشفة الوحدة.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر أرشفة الوحدة.'); }
    finally { setBusy(false); }
  }

  async function createLesson(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moduleId || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ lesson: Lesson }>(await fetch('/api/academy/lessons', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, title: lessonTitle, lessonType, body: lessonBody, resourceUrl: lessonUrl, durationMinutes: lessonDuration, sortOrder: lessons.length }),
      }));
      setLessons(current => [...current, result.lesson]);
      setLessonTitle(''); setLessonBody(''); setLessonUrl(''); setLessonDuration(0);
      setNotice('تم حفظ الدرس في قاعدة البيانات.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر إنشاء الدرس.'); }
    finally { setBusy(false); }
  }

  async function saveLesson(lesson: Lesson, patch: Partial<Lesson>) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ lesson: Lesson }>(await fetch('/api/academy/lessons', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lesson.id, title: patch.title, body: patch.body, lessonType: patch.lesson_type, resourceUrl: patch.resource_url ?? '', durationMinutes: patch.duration_minutes, sortOrder: patch.sort_order, status: patch.status }),
      }));
      setLessons(current => current.map(row => row.id === lesson.id ? { ...row, ...result.lesson } : row));
      setNotice('تم تحديث الدرس.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر تحديث الدرس.'); }
    finally { setBusy(false); }
  }

  async function archiveLesson(lesson: Lesson) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await readJson<{ lesson: { id: string; status: string } }>(await fetch('/api/academy/lessons?id=' + encodeURIComponent(lesson.id), { method: 'DELETE' }));
      setLessons(current => current.map(row => row.id === lesson.id ? { ...row, status: 'archived' } : row));
      setNotice('تمت أرشفة الدرس.');
    } catch (err) { setError(err instanceof Error ? err.message : 'تعذر أرشفة الدرس.'); }
    finally { setBusy(false); }
  }

  return <div className="grid" style={{ marginTop: 20 }}>
    {error && <div className="card" role="alert">{error}</div>}
    {notice && <div className="card" role="status">{notice}</div>}
    <section className="card">
      <h2>اختيار الدورة</h2>
      <label>الدورة الموجودة في قاعدة البيانات<select value={courseId} onChange={e => { setCourseId(e.target.value); setModuleId(''); }}><option value="">اختر دورة</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}</select></label>
      {!courses.length && <p className="muted">لا توجد دورات قابلة للإدارة، أو تعذر تحميل مخطط courses. لم ننشئ جدول دورات مكررًا.</p>}
    </section>

    <section className="grid two">
      <form className="card" onSubmit={createModule} style={{ display: 'grid', gap: 10 }}>
        <h2>إضافة وحدة</h2>
        <label>اسم الوحدة<input required minLength={2} maxLength={180} value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} /></label>
        <label>الوصف<textarea rows={3} maxLength={2000} value={moduleDescription} onChange={e => setModuleDescription(e.target.value)} /></label>
        <button className="btn primary" disabled={busy || !courseId}>{busy ? 'جارٍ الحفظ...' : 'إنشاء الوحدة'}</button>
      </form>
      <section className="card">
        <h2>الوحدات</h2>
        {!modules.length && <p className="muted">لا توجد وحدات للدورة المحددة.</p>}
        {modules.map(module => <article key={module.id} className="card" style={{ marginTop: 10 }}>
          <button type="button" className="btn secondary" onClick={() => setModuleId(module.id)}>{module.title} · {module.status}</button>
          <ModuleEditor module={module} disabled={busy} onSave={patch => void saveModule(module, patch)} />
          {module.status !== 'archived' && <button type="button" disabled={busy} onClick={() => void archiveModule(module)}>أرشفة الوحدة</button>}
        </article>)}
      </section>
    </section>

    <section className="grid two">
      <form className="card" onSubmit={createLesson} style={{ display: 'grid', gap: 10 }}>
        <h2>إضافة درس</h2>
        <p className="muted">الوحدة المحددة: {modules.find(module => module.id === moduleId)?.title ?? 'اختر وحدة أولًا'}</p>
        <label>عنوان الدرس<input required minLength={2} maxLength={180} value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} /></label>
        <label>نوع المحتوى<select value={lessonType} onChange={e => setLessonType(e.target.value)}><option value="text">نص</option><option value="video">فيديو</option><option value="document">وثيقة</option><option value="link">رابط</option></select></label>
        <label>المحتوى<textarea rows={5} maxLength={50000} value={lessonBody} onChange={e => setLessonBody(e.target.value)} /></label>
        <label>رابط المورد<input type="url" maxLength={2048} value={lessonUrl} onChange={e => setLessonUrl(e.target.value)} placeholder="https://" /></label>
        <label>المدة بالدقائق<input type="number" min={0} max={1440} value={lessonDuration} onChange={e => setLessonDuration(Number(e.target.value))} /></label>
        <button className="btn primary" disabled={busy || !moduleId}>{busy ? 'جارٍ الحفظ...' : 'إنشاء الدرس'}</button>
      </form>
      <section className="card">
        <h2>الدروس</h2>
        {!lessons.length && <p className="muted">لا توجد دروس للوحدة المحددة.</p>}
        {lessons.map(lesson => <article key={lesson.id} className="card" style={{ marginTop: 10 }}>
          <h3>{lesson.title}</h3><p className="muted">{lesson.lesson_type} · {lesson.duration_minutes} دقيقة · {lesson.status}</p>
          <LessonEditor lesson={lesson} disabled={busy} onSave={patch => void saveLesson(lesson, patch)} />
          {lesson.status !== 'archived' && <button type="button" disabled={busy} onClick={() => void archiveLesson(lesson)}>أرشفة الدرس</button>}
        </article>)}
      </section>
    </section>
  </div>;
}

function ModuleEditor({ module, disabled, onSave }: { module: Module; disabled: boolean; onSave: (patch: Partial<Module>) => void }) {
  const [title, setTitle] = useState(module.title);
  const [description, setDescription] = useState(module.description);
  const [sortOrder, setSortOrder] = useState(module.sort_order);
  const [status, setStatus] = useState(module.status);
  return <details style={{ marginTop: 8 }}><summary>تعديل الوحدة</summary><form onSubmit={e => { e.preventDefault(); onSave({ title, description, sort_order: sortOrder, status }); }} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
    <label>العنوان<input required minLength={2} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label>الوصف<textarea maxLength={2000} value={description} onChange={e => setDescription(e.target.value)} /></label>
    <label>الترتيب<input type="number" min={0} max={100000} value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></label>
    <label>الحالة<select value={status} onChange={e => setStatus(e.target.value)}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
    <button className="btn primary" disabled={disabled}>حفظ</button>
  </form></details>;
}

function LessonEditor({ lesson, disabled, onSave }: { lesson: Lesson; disabled: boolean; onSave: (patch: Partial<Lesson>) => void }) {
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body);
  const [lessonType, setLessonType] = useState(lesson.lesson_type);
  const [resourceUrl, setResourceUrl] = useState(lesson.resource_url ?? '');
  const [duration, setDuration] = useState(lesson.duration_minutes);
  const [sortOrder, setSortOrder] = useState(lesson.sort_order);
  const [status, setStatus] = useState(lesson.status);
  return <details style={{ marginTop: 8 }}><summary>تعديل الدرس</summary><form onSubmit={e => { e.preventDefault(); onSave({ title, body, lesson_type: lessonType, resource_url: resourceUrl, duration_minutes: duration, sort_order: sortOrder, status }); }} style={{ display: 'grid', gap: 8, marginTop: 8 }}>
    <label>العنوان<input required minLength={2} maxLength={180} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label>نوع المحتوى<select value={lessonType} onChange={e => setLessonType(e.target.value)}><option value="text">نص</option><option value="video">فيديو</option><option value="document">وثيقة</option><option value="link">رابط</option></select></label>
    <label>المحتوى<textarea maxLength={50000} rows={4} value={body} onChange={e => setBody(e.target.value)} /></label>
    <label>الرابط<input type="url" maxLength={2048} value={resourceUrl} onChange={e => setResourceUrl(e.target.value)} /></label>
    <label>المدة بالدقائق<input type="number" min={0} max={1440} value={duration} onChange={e => setDuration(Number(e.target.value))} /></label>
    <label>الترتيب<input type="number" min={0} max={100000} value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} /></label>
    <label>الحالة<select value={status} onChange={e => setStatus(e.target.value)}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></label>
    <button className="btn primary" disabled={disabled}>حفظ</button>
  </form></details>;
}
