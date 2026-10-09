import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function published(row: Record<string, unknown>) {
  if (typeof row.published === 'boolean') return row.published;
  if (typeof row.is_published === 'boolean') return row.is_published;
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.visibility === 'string') return ['published', 'public'].includes(row.visibility.toLowerCase());
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.status === 'string') return ['published', 'active', 'public'].includes(row.status.toLowerCase());
  return false;
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data, error } = await db.from('academy_enrollments')
    .select('id,course_id,status,enrolled_at,completed_at')
    .eq('user_id', user.id).order('enrolled_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل تسجيلاتك.' }, { status: 500 });
  return NextResponse.json({ enrollments: data ?? [] });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'سجّل الدخول قبل التسجيل في دورة.' }, { status: 401 });
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    if (!courseId || courseId.length > 120) return NextResponse.json({ error: 'معرّف الدورة غير صالح.' }, { status: 400 });
    const { data: course, error: courseError } = await db.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (courseError) return NextResponse.json({ error: 'تعذر التحقق من الدورة.' }, { status: 500 });
    if (!course || !published(course as Record<string, unknown>)) return NextResponse.json({ error: 'الدورة غير منشورة أو غير موجودة.' }, { status: 404 });
    const { data, error } = await db.from('academy_enrollments').upsert({
      user_id: user.id, course_id: courseId, status: 'enrolled', completed_at: null,
    }, { onConflict: 'user_id,course_id', ignoreDuplicates: true })
      .select('id,course_id,status,enrolled_at,completed_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر حفظ التسجيل.' }, { status: 500 });
    if (data) return NextResponse.json({ enrollment: data }, { status: 201 });
    const { data: existing, error: readError } = await db.from('academy_enrollments')
      .select('id,course_id,status,enrolled_at,completed_at').eq('user_id', user.id).eq('course_id', courseId).single();
    if (readError || !existing) return NextResponse.json({ error: 'تعذر تأكيد التسجيل المحفوظ.' }, { status: 500 });
    return NextResponse.json({ enrollment: existing, alreadyEnrolled: true });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
