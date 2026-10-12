'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Enrollment = { id: string; course_id: string; offering_id?: string | null; status: string };
type Offering = { id: string; label: string; language: string; capacity: number | null };
type Progress = { lesson_id: string; completed: boolean };

export function CourseLearningActions({ courseId, lessons, offerings = [] }: { courseId: string; lessons: { id: string; title: string; accessible?: boolean }[]; offerings?: Offering[] }) {
  const router = useRouter();
  const [enrolled, setEnrolled] = useState(false);
  const [offeringId, setOfferingId] = useState(offerings[0]?.id || '');
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [enrollmentResponse, progressResponse] = await Promise.all([
        fetch('/api/academy/enrollments', { cache: 'no-store' }),
        fetch('/api/academy/progress', { cache: 'no-store' }),
      ]);
      if (enrollmentResponse.status === 401 || progressResponse.status === 401) {
        setSignedIn(false);
        return;
      }
      const enrollmentData = await enrollmentResponse.json() as { enrollments?: Enrollment[]; error?: string };
      const progressData = await progressResponse.json() as { progress?: Progress[]; error?: string };
      if (!enrollmentResponse.ok) throw new Error(enrollmentData.error || 'تعذر التحقق من التسجيل.');
      if (!progressResponse.ok) throw new Error(progressData.error || 'تعذر تحميل تقدم الدروس.');
      setSignedIn(true);
      setEnrolled((enrollmentData.enrollments ?? []).some(item => item.course_id === courseId && ['enrolled','completed'].includes(item.status)));
      setCompleted(Object.fromEntries((progressData.progress ?? []).map(item => [item.lesson_id, item.completed])));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل حالة التعلم.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { void load(); }, [load]);

  async function enroll() {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/academy/enrollments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, offeringId: offeringId || null }),
      });
      const result = await response.json() as { enrollment?: Enrollment; alreadyEnrolled?: boolean; error?: string };
      if (!response.ok || !result.enrollment) throw new Error(result.error || 'تعذر التسجيل في الدورة.');
      setEnrolled(['enrolled','completed'].includes(result.enrollment.status));
      router.refresh();
      setNotice(result.alreadyEnrolled ? 'أنت مسجل بالفعل في هذه الدورة.' : 'تم حفظ تسجيلك في الدورة.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر التسجيل.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleLesson(lessonId: string, value: boolean) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/academy/progress', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, completed: value }),
      });
      const result = await response.json() as { progress?: Progress; error?: string };
      if (!response.ok || !result.progress) throw new Error(result.error || 'تعذر حفظ تقدم الدرس.');
      setCompleted(current => ({ ...current, [lessonId]: result.progress!.completed }));
      setNotice('تم حفظ تقدمك الدراسي.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ التقدم.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">جارٍ التحقق من التسجيل والتقدم الدراسي...</p>;
  return <section className="card" style={{ marginTop: 24, display: 'grid', gap: 12 }}>
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {signedIn === false ? <p>سجّل الدخول لتسجيل نفسك وحفظ تقدمك الدراسي. <Link href="/login">تسجيل الدخول</Link></p>
      : !enrolled ? <><p className="muted">التسجيل النهائي يتطلب قبولًا موثقًا وتأكيد الدفع من جهة موثوقة. اختر نفس العرض الذي قدمت طلب القبول له.</p>
        {offerings.length > 0 && <label>المدرسة أو الفرع
          <select required value={offeringId} onChange={e => setOfferingId(e.target.value)}>
            <option value="">اختر العرض التعليمي</option>
            {offerings.map(offering => <option key={offering.id} value={offering.id}>{offering.label} — {offering.language.toUpperCase()}</option>)}
          </select>
        </label>}
        <button className="btn primary" type="button" disabled={busy || (offerings.length > 0 && !offeringId)} onClick={() => void enroll()}>{busy ? 'جارٍ التسجيل...' : 'التسجيل في الدورة'}</button></>
      : <><strong>أنت مسجل في هذه الدورة</strong><p className="muted">علّم الدروس التي أكملتها لحفظ تقدمك.</p>
        {lessons.map(lesson => <label key={lesson.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input type="checkbox" checked={completed[lesson.id] === true} disabled={busy || lesson.accessible === false} onChange={event => void toggleLesson(lesson.id, event.target.checked)} />
          {lesson.title}
        </label>)}
      </>}
  </section>;
}
