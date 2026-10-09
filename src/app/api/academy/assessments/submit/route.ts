import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الاختبار غير صالح.' }, { status: 400 });
  const db = await createClient();
  const { data, error } = await db.rpc('get_published_academy_assessment', { p_assessment_id: id });
  if (error) return NextResponse.json({ error: 'تعذر تحميل الاختبار المنشور.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'الاختبار غير منشور أو غير موجود.' }, { status: 404 });
  return NextResponse.json({ assessment: data });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); }
    catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); }
  }
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'سجّل الدخول قبل إرسال إجابات الاختبار.' }, { status: 401 });
    const body = await request.json();
    const id = typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
    const answers = body.answers;
    if (!validUuid.test(id) || !answers || typeof answers !== 'object' || Array.isArray(answers)) return NextResponse.json({ error: 'بيانات الإجابة غير صالحة.' }, { status: 400 });
    const { data, error } = await db.rpc('submit_academy_assessment', { p_assessment_id: id, p_answers: answers });
    if (error) {
      const message = error.message.includes('ATTEMPT_LIMIT_REACHED') ? 'استنفدت عدد محاولات هذا الاختبار.' :
        error.message.includes('ENROLLMENT_REQUIRED') ? 'يجب التسجيل في الدورة أولًا.' :
        error.message.includes('ANSWERS_INCOMPLETE') ? 'أجب عن جميع الأسئلة قبل الإرسال.' :
        error.message.includes('ANSWER_OPTION_INVALID') ? 'تحتوي الإجابات على خيار غير صالح.' : 'تعذر تصحيح الاختبار.';
      return NextResponse.json({ error: message }, { status: error.message.includes('ATTEMPT_LIMIT_REACHED') ? 409 : 400 });
    }
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.attempt_id) return NextResponse.json({ error: 'لم تُرجع قاعدة البيانات نتيجة تصحيح صالحة.' }, { status: 500 });
    return NextResponse.json({ attempt: result });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
