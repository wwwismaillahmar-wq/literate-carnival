import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Course = Record<string, unknown>;
function published(course: Course) {
  if (typeof course.published === 'boolean') return course.published;
  if (typeof course.is_published === 'boolean') return course.is_published;
  if (typeof course.is_active === 'boolean') return course.is_active;
  if (typeof course.visibility === 'string') return ['published','public'].includes(course.visibility.toLowerCase());
  if (typeof course.active === 'boolean') return course.active;
  return typeof course.status === 'string' && ['published','active','public'].includes(course.status.toLowerCase());
}
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
export async function GET(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول لعرض طلبات القبول.' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get('id')?.trim();
  let query = db.from('academy_admission_applications').select('id,course_id,user_id,applicant_name,applicant_email,applicant_phone,answers,screening_version,status,reviewer_id,reviewed_at,review_note,submitted_at,updated_at').order('submitted_at', { ascending: false }).limit(200);
  if (id) {
    if (!uuid.test(id)) return NextResponse.json({ error: 'معرّف الطلب غير صالح.' }, { status: 400 });
    query = query.eq('id', id);
  }
  if (!allowed) query = query.eq('user_id', user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل طلبات القبول.' }, { status: 500 });
  return NextResponse.json({ applications: data ?? [], admin: allowed });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const consent = body.consent === true;
    const answers = body.answers && typeof body.answers === 'object' && !Array.isArray(body.answers) ? body.answers as Record<string, unknown> : null;
    if (!courseId || courseId.length > 120 || name.length < 2 || name.length > 160 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 6 || phone.length > 30 ||
        !consent || !answers || Object.keys(answers).length > 100) {
      return NextResponse.json({ error: 'أكمل بيانات المتقدم والأسئلة والموافقة قبل إرسال الطلب.' }, { status: 400 });
    }
    const { data: course, error: courseError } = await db.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (courseError) return NextResponse.json({ error: 'تعذر التحقق من الدورة.' }, { status: 500 });
    if (!course || !published(course as Course)) return NextResponse.json({ error: 'الدورة غير منشورة أو غير متاحة للقبول.' }, { status: 404 });
    const { data: questions, error: questionError } = await db.from('academy_admission_questions').select('id,prompt,question_type,options,required,active').eq('course_id', courseId).eq('active', true).order('sort_order');
    if (questionError) return NextResponse.json({ error: 'تعذر التحقق من أسئلة القبول.' }, { status: 500 });
    const questionIds = new Set((questions ?? []).map(q => q.id));
    if (Object.keys(answers).some(key => !questionIds.has(key))) return NextResponse.json({ error: 'تحتوي الإجابات على سؤال غير معتمد لهذه الدورة.' }, { status: 400 });
    for (const question of questions ?? []) {
      const answer = answers[question.id];
      if (question.required && (typeof answer !== 'string' || !answer.trim())) return NextResponse.json({ error: 'أجب عن جميع الأسئلة الإلزامية.' }, { status: 400 });
      if (answer !== undefined && typeof answer !== 'string') return NextResponse.json({ error: 'صيغة إحدى الإجابات غير صالحة.' }, { status: 400 });
      if (typeof answer === 'string' && answer.length > 4000) return NextResponse.json({ error: 'إحدى الإجابات تتجاوز الحد المسموح.' }, { status: 400 });
      if (question.question_type === 'single_choice' && typeof answer === 'string' && !(question.options as string[]).includes(answer)) return NextResponse.json({ error: 'اختر إجابة من الخيارات المعروضة.' }, { status: 400 });
      if (question.question_type === 'yes_no' && typeof answer === 'string' && !['yes','no'].includes(answer)) return NextResponse.json({ error: 'إجابة نعم/لا غير صالحة.' }, { status: 400 });
    }
    const screeningVersion = { submittedAt: new Date().toISOString(), questions: (questions ?? []).map(q => ({ id: q.id, prompt: q.prompt, question_type: q.question_type, options: q.options, required: q.required })) };
    const { data, error } = await db.from('academy_admission_applications').insert({
      course_id: courseId, user_id: user?.id ?? null, applicant_name: name, applicant_email: email, applicant_phone: phone,
      answers, screening_version: screeningVersion, consent_at: new Date().toISOString(), status: 'submitted',
    }).select('id,course_id,status,submitted_at').single();
    if (error?.code === '23505') return NextResponse.json({ error: 'يوجد طلب قائم بهذا البريد لهذه الدورة.' }, { status: 409 });
    if (error) return NextResponse.json({ error: 'تعذر حفظ طلب القبول.' }, { status: 500 });
    return NextResponse.json({ application: data, message: 'تم إرسال طلب القبول للمراجعة. لا يتم التسجيل النهائي أو الدفع قبل صدور قرار القبول.' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'قرارات القبول للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const note = body.reviewNote === undefined ? '' : typeof body.reviewNote === 'string' ? body.reviewNote.trim() : null;
    if (!uuid.test(id) || !['under_review','accepted','rejected','needs_information','cancelled','expired'].includes(status) ||
        note === null || note.length > 4000) return NextResponse.json({ error: 'بيانات قرار القبول غير صالحة.' }, { status: 400 });
    const { data: current, error: readError } = await db.from('academy_admission_applications').select('id,status').eq('id', id).maybeSingle();
    if (readError || !current) return NextResponse.json({ error: 'طلب القبول غير موجود.' }, { status: 404 });
    const allowedTransitions: Record<string, string[]> = {
      submitted: ['under_review','accepted','rejected','needs_information','cancelled','expired'],
      under_review: ['accepted','rejected','needs_information','cancelled','expired'],
      needs_information: ['submitted','under_review','rejected','cancelled','expired'],
      accepted: ['expired','cancelled'],
      rejected: [],
      payment_pending: ['expired','cancelled'],
      paid: ['enrolled','cancelled'],
      enrolled: [],
      cancelled: [],
      expired: [],
    };
    if (!allowedTransitions[current.status]?.includes(status)) return NextResponse.json({ error: 'انتقال الحالة غير مسموح من الحالة الحالية.' }, { status: 409 });
    const patch = { status, reviewer_id: user.id, reviewed_at: new Date().toISOString(), review_note: note, updated_at: new Date().toISOString() };
    const { data, error } = await db.from('academy_admission_applications').update(patch).eq('id', id).select('id,course_id,status,reviewer_id,reviewed_at,review_note,updated_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ قرار القبول.' }, { status: 500 });
    return NextResponse.json({ application: data });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
