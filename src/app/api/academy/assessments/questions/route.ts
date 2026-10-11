import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function admin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}
export async function GET(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إدارة الأسئلة للإدارة فقط.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('assessmentId')?.trim() ?? '';
  if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الاختبار غير صالح.' }, { status: 400 });
  const { data, error } = await db.from('academy_assessment_questions').select('id,assessment_id,prompt,options,correct_option,sort_order,created_at').eq('assessment_id', id).order('sort_order');
  if (error) return NextResponse.json({ error: 'تعذر تحميل أسئلة الاختبار.' }, { status: 500 });
  return NextResponse.json({ questions: data ?? [] });
}
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إضافة الأسئلة للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const assessmentId = typeof body.assessmentId === 'string' ? body.assessmentId.trim() : '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const options = Array.isArray(body.options) ? body.options : [];
    const correctOption = typeof body.correctOption === 'string' ? body.correctOption.trim() : '';
    if (!validUuid.test(assessmentId) || prompt.length < 2 || prompt.length > 2000 || options.length < 2 || options.length > 8 ||
        options.some((option: unknown) => !option || typeof option !== 'object' || typeof (option as {key?:unknown}).key !== 'string' || typeof (option as {label?:unknown}).label !== 'string' || !(option as {key:string}).key.trim() || !(option as {label:string}).label.trim() || (option as {key:string}).key.length > 80 || (option as {label:string}).label.length > 300) ||
        new Set(options.map((option: {key:string}) => option.key.trim())).size !== options.length ||
        !options.some((option: {key:string}) => option.key.trim() === correctOption)) {
      return NextResponse.json({ error: 'تحقق من نص السؤال والخيارات والمفتاح الصحيح.' }, { status: 400 });
    }
    const { data: assessment, error: assessmentError } = await db.from('academy_assessments').select('id,status').eq('id', assessmentId).maybeSingle();
    if (assessmentError || !assessment) return NextResponse.json({ error: 'الاختبار غير موجود.' }, { status: 404 });
    if (assessment.status !== 'draft') return NextResponse.json({ error: 'لا يمكن تعديل أسئلة اختبار منشور أو مؤرشف؛ أنشئ نسخة جديدة.' }, { status: 409 });
    const { data, error } = await db.from('academy_assessment_questions').insert({
      assessment_id: assessmentId, prompt, options: options.map((option: {key:string;label:string}) => ({ key: option.key.trim(), label: option.label.trim() })), correct_option: correctOption, sort_order: Number.isInteger(body.sortOrder) && body.sortOrder >= 0 ? body.sortOrder : 0,
    }).select('id,assessment_id,prompt,options,correct_option,sort_order,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ السؤال.' }, { status: 500 });
    return NextResponse.json({ question: data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
