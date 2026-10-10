import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function admin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
function validQuestion(body: Record<string, unknown>) {
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  const type = typeof body.questionType === 'string' ? body.questionType : 'text';
  const options = body.options === undefined ? [] : body.options;
  const sortOrder = body.sortOrder === undefined ? 0 : body.sortOrder;
  if (prompt.length < 5 || prompt.length > 2000 || !['text','single_choice','yes_no'].includes(type) ||
      !Array.isArray(options) || options.length > 20 || options.some(x => typeof x !== 'string' || !x.trim() || x.length > 180) ||
      !Number.isInteger(sortOrder) || (sortOrder as number) < 0 || (sortOrder as number) > 10000) return null;
  if (type === 'single_choice' && options.length < 2) return null;
  return { prompt, question_type: type, options, sort_order: sortOrder as number, required: body.required !== false, active: body.active !== false };
}
export async function GET(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  const courseId = new URL(request.url).searchParams.get('courseId')?.trim() ?? '';
  if (!courseId || courseId.length > 120) return NextResponse.json({ error: 'معرّف الدورة غير صالح.' }, { status: 400 });
  let query = db.from('academy_admission_questions').select('id,course_id,prompt,question_type,options,required,sort_order,active,created_at,updated_at').eq('course_id', courseId).order('sort_order');
  if (!user || !allowed) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل أسئلة التأهيل.' }, { status: 500 });
  return NextResponse.json({ questions: data ?? [], admin: allowed });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول لإدارة أسئلة التأهيل.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إدارة أسئلة التأهيل للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    const question = validQuestion(body);
    if (!courseId || courseId.length > 120 || !question) return NextResponse.json({ error: 'بيانات سؤال التأهيل غير صالحة.' }, { status: 400 });
    const { data, error } = await db.from('academy_admission_questions').insert({ course_id: courseId, ...question, created_by: user.id })
      .select('id,course_id,prompt,question_type,options,required,sort_order,active,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ سؤال التأهيل.' }, { status: 500 });
    return NextResponse.json({ question: data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تعديل أسئلة التأهيل للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!uuid.test(id)) return NextResponse.json({ error: 'معرّف السؤال غير صالح.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.active !== undefined) {
      if (typeof body.active !== 'boolean') return NextResponse.json({ error: 'حالة السؤال غير صالحة.' }, { status: 400 });
      patch.active = body.active;
    }
    if (body.prompt !== undefined || body.questionType !== undefined || body.options !== undefined || body.sortOrder !== undefined || body.required !== undefined) {
      const current = await db.from('academy_admission_questions').select('prompt,question_type,options,sort_order,required,active').eq('id', id).maybeSingle();
      if (current.error || !current.data) return NextResponse.json({ error: 'السؤال غير موجود.' }, { status: 404 });
      const merged = validQuestion({
        prompt: body.prompt ?? current.data.prompt,
        questionType: body.questionType ?? current.data.question_type,
        options: body.options ?? current.data.options,
        sortOrder: body.sortOrder ?? current.data.sort_order,
        required: body.required ?? current.data.required,
        active: body.active ?? current.data.active,
      });
      if (!merged) return NextResponse.json({ error: 'بيانات سؤال التأهيل غير صالحة.' }, { status: 400 });
      Object.assign(patch, merged);
    }
    const { data, error } = await db.from('academy_admission_questions').update(patch).eq('id', id)
      .select('id,course_id,prompt,question_type,options,required,sort_order,active,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث السؤال.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'السؤال غير موجود.' }, { status: 404 });
    return NextResponse.json({ question: data });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
