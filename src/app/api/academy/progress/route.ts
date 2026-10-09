import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data, error } = await db.from('academy_lesson_progress')
    .select('id,enrollment_id,lesson_id,completed,completed_at,updated_at')
    .eq('user_id', user.id).order('updated_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل تقدمك الدراسي.' }, { status: 500 });
  return NextResponse.json({ progress: data ?? [] });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const body = await request.json();
    const lessonId = typeof body.lessonId === 'string' ? body.lessonId.trim() : '';
    const completed = body.completed === true;
    if (!validUuid.test(lessonId) || typeof body.completed !== 'boolean') return NextResponse.json({ error: 'بيانات تقدم الدرس غير صالحة.' }, { status: 400 });
    const { data: lesson, error: lessonError } = await db.from('academy_lessons')
      .select('id,module_id,status,academy_modules!inner(course_id,status)')
      .eq('id', lessonId).eq('status', 'published').eq('academy_modules.status', 'published').maybeSingle();
    if (lessonError) return NextResponse.json({ error: 'تعذر التحقق من الدرس.' }, { status: 500 });
    if (!lesson) return NextResponse.json({ error: 'الدرس غير منشور أو غير موجود.' }, { status: 404 });
    const moduleRow = Array.isArray(lesson.academy_modules) ? lesson.academy_modules[0] : lesson.academy_modules;
    if (!moduleRow?.course_id) return NextResponse.json({ error: 'تعذر تحديد الدورة المرتبطة بالدرس.' }, { status: 500 });
    const { data: enrollment, error: enrollmentError } = await db.from('academy_enrollments')
      .select('id').eq('user_id', user.id).eq('course_id', String(moduleRow.course_id)).eq('status', 'enrolled').maybeSingle();
    if (enrollmentError) return NextResponse.json({ error: 'تعذر التحقق من التسجيل.' }, { status: 500 });
    if (!enrollment) return NextResponse.json({ error: 'سجّل في الدورة قبل حفظ تقدم الدروس.' }, { status: 403 });
    const now = new Date().toISOString();
    const { data, error } = await db.from('academy_lesson_progress').upsert({
      enrollment_id: enrollment.id, lesson_id: lessonId, user_id: user.id,
      completed, completed_at: completed ? now : null, updated_at: now,
    }, { onConflict: 'enrollment_id,lesson_id' })
      .select('id,enrollment_id,lesson_id,completed,completed_at,updated_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ تقدم الدرس.' }, { status: 500 });
    return NextResponse.json({ progress: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
