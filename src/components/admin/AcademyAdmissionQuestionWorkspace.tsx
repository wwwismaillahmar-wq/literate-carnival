'use client';

import { useEffect, useState } from 'react';

type Course = { id: string; title: string; status: string };
type Question = {
  id: string; course_id: string; prompt: string; question_type: 'text'|'single_choice'|'yes_no';
  options: string[]; required: boolean; active: boolean; sort_order: number;
};

async function readJson<T>(response: Response): Promise<T> {
  const result = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(result.error || 'تعذر تنفيذ العملية.');
  return result;
}

export function AcademyAdmissionQuestionWorkspace() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [prompt, setPrompt] = useState('');
  const [questionType, setQuestionType] = useState<'text'|'single_choice'|'yes_no'>('text');
  const [optionsText, setOptionsText] = useState('');
  const [required, setRequired] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await readJson<{ courses: Course[] }>(await fetch('/api/academy/courses', { cache: 'no-store' }));
        if (!active) return;
        setCourses(result.courses);
        setCourseId(current => current || result.courses[0]?.id || '');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل الدورات.');
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!courseId) { setQuestions([]); return () => { active = false; }; }
    void (async () => {
      try {
        setError('');
        const result = await readJson<{ questions: Question[] }>(await fetch('/api/academy/admission-questions?courseId=' + encodeURIComponent(courseId), { cache: 'no-store' }));
        if (active) setQuestions(result.questions);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'تعذر تحميل أسئلة القبول.');
      }
    })();
    return () => { active = false; };
  }, [courseId]);

  async function createQuestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseId || busy) return;
    const options = questionType === 'single_choice'
      ? optionsText.split('\n').map(value => value.trim()).filter(Boolean)
      : [];
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ question: Question }>(await fetch('/api/academy/admission-questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, prompt, questionType, options, required, sortOrder: questions.length, active: true }),
      }));
      setQuestions(current => [...current, result.question]);
      setPrompt(''); setOptionsText(''); setQuestionType('text'); setRequired(true);
      setNotice('تم حفظ سؤال القبول في قاعدة البيانات.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر حفظ السؤال.'); }
    finally { setBusy(false); }
  }

  async function toggleQuestion(question: Question) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await readJson<{ question: Question }>(await fetch('/api/academy/admission-questions', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: question.id, active: !question.active }),
      }));
      setQuestions(current => current.map(row => row.id === question.id ? { ...row, ...result.question } : row));
      setNotice(question.active ? 'تم تعطيل السؤال.' : 'تم تفعيل السؤال.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تحديث السؤال.'); }
    finally { setBusy(false); }
  }

  return <section className="grid" style={{ marginTop: 24, gap: 16 }}>
    <h2>أسئلة التأهيل والقبول</h2>
    <p className="muted">تُربط الأسئلة بالدورة المحددة، وتُحفظ نسخة من الأسئلة والإجابات مع كل طلب قبول. لا تجعل سؤالًا نشطًا قبل مراجعة صياغته وخياراته.</p>
    {error && <div className="card" role="alert">{error}</div>}
    {notice && <div className="card" role="status">{notice}</div>}
    {loading ? <p className="muted">جارٍ تحميل الدورات...</p> : <>
      <section className="card">
        <label>الدورة<select value={courseId} onChange={e => setCourseId(e.target.value)}><option value="">اختر دورة</option>{courses.map(course => <option key={course.id} value={course.id}>{course.title} · {course.status}</option>)}</select></label>
        {!courses.length && <p className="muted">أنشئ دورة أولًا في مساحة تأليف الأكاديمية.</p>}
      </section>
      <form className="card" onSubmit={createQuestion} style={{ display: 'grid', gap: 10 }}>
        <h3>إضافة سؤال جديد</h3>
        <label>نص السؤال<textarea required minLength={5} maxLength={2000} rows={3} value={prompt} onChange={e => setPrompt(e.target.value)} /></label>
        <label>نوع الإجابة<select value={questionType} onChange={e => setQuestionType(e.target.value as typeof questionType)}><option value="text">إجابة نصية</option><option value="single_choice">اختيار واحد</option><option value="yes_no">نعم / لا</option></select></label>
        {questionType === 'single_choice' && <label>الخيارات (كل خيار في سطر مستقل)<textarea required rows={4} value={optionsText} onChange={e => setOptionsText(e.target.value)} placeholder={'الخيار الأول\nالخيار الثاني'} /></label>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> إجابة إلزامية</label>
        <button className="btn primary" disabled={busy || !courseId || prompt.trim().length < 5 || (questionType === 'single_choice' && optionsText.split('\n').filter(x => x.trim()).length < 2)}>{busy ? 'جارٍ الحفظ...' : 'حفظ سؤال التأهيل'}</button>
      </form>
      <section className="grid">
        <h3>أسئلة الدورة المحددة ({questions.length})</h3>
        {!questions.length && <div className="card">لا توجد أسئلة مضافة لهذه الدورة.</div>}
        {questions.map((question, index) => <article className="card" key={question.id}>
          <span className="kicker">سؤال {index + 1} · {question.question_type === 'text' ? 'نصي' : question.question_type === 'single_choice' ? 'اختيار واحد' : 'نعم/لا'}</span>
          <p>{question.prompt}</p>
          {question.question_type === 'single_choice' && <ul>{question.options.map(option => <li key={option}>{option}</li>)}</ul>}
          <p className="muted">{question.required ? 'إلزامي' : 'اختياري'} · {question.active ? 'نشط' : 'معطّل'}</p>
          <button type="button" className="btn secondary" disabled={busy} onClick={() => void toggleQuestion(question)}>{question.active ? 'تعطيل السؤال' : 'تفعيل السؤال'}</button>
        </article>)}
      </section>
    </>}
  </section>;
}
