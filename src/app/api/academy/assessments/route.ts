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

export async function GET() {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إدارة الاختبارات للإدارة فقط.' }, { status: 403 });
  const [{ data: modules, error: moduleError }, { data: assessments, error: assessmentError }] = await Promise.all([
    db.from('academy_modules').select('id,course_id,title,status').order('created_at', { ascending: false }).limit(200),
    db.from('academy_assessments').select('id,module_id,title,pass_score,max_attempts,status,created_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (moduleError || assessmentError) return NextResponse.json({ error: 'تعذر تحميل الاختبارات والوحدات.' }, { status: 500 });
  return NextResponse.json({ modules: modules ?? [], assessments: assessments ?? [] });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إنشاء الاختبارات للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const moduleId = typeof body.moduleId === 'string' ? body.moduleId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const passScore = body.passScore === undefined ? 70 : body.passScore;
    const maxAttempts = body.maxAttempts === undefined ? 5 : body.maxAttempts;
    if (!validUuid.test(moduleId) || title.length < 2 || title.length > 180 || !Number.isInteger(passScore) || passScore < 1 || passScore > 100 || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
      return NextResponse.json({ error: 'بيانات الاختبار غير صالحة.' }, { status: 400 });
    }
    const { data: moduleRow, error: moduleError } = await db.from('academy_modules').select('id').eq('id', moduleId).maybeSingle();
    if (moduleError || !moduleRow) return NextResponse.json({ error: 'الوحدة غير موجودة.' }, { status: 404 });
    const { data, error } = await db.from('academy_assessments').insert({ module_id: moduleId, title, pass_score: passScore, max_attempts: maxAttempts, created_by: user.id })
      .select('id,module_id,title,pass_score,max_attempts,status,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الاختبار.' }, { status: 500 });
    return NextResponse.json({ assessment: data }, { status: 201 });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تعديل الاختبارات للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الاختبار غير صالح.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 180) return NextResponse.json({ error: 'عنوان الاختبار غير صالح.' }, { status: 400 });
      patch.title = body.title.trim();
    }
    if (body.passScore !== undefined) {
      if (!Number.isInteger(body.passScore) || body.passScore < 1 || body.passScore > 100) return NextResponse.json({ error: 'درجة النجاح غير صالحة.' }, { status: 400 });
      patch.pass_score = body.passScore;
    }
    if (body.maxAttempts !== undefined) {
      if (!Number.isInteger(body.maxAttempts) || body.maxAttempts < 1 || body.maxAttempts > 10) return NextResponse.json({ error: 'عدد المحاولات غير صالح.' }, { status: 400 });
      patch.max_attempts = body.maxAttempts;
    }
    if (body.status !== undefined) {
      if (!['draft','published','archived'].includes(body.status)) return NextResponse.json({ error: 'حالة الاختبار غير صالحة.' }, { status: 400 });
      if (body.status === 'published') {
        const { data: existing, error: existingError } = await db.from('academy_assessments').select('module_id').eq('id', id).maybeSingle();
        if (existingError || !existing) return NextResponse.json({ error: 'الاختبار غير موجود.' }, { status: 404 });
        const { data: moduleRow, error: moduleError } = await db.from('academy_modules').select('status').eq('id', existing.module_id).maybeSingle();
        if (moduleError || moduleRow?.status !== 'published') return NextResponse.json({ error: 'انشر الوحدة المرتبطة أولًا قبل نشر الاختبار.' }, { status: 400 });
        const { count, error } = await db.from('academy_assessment_questions').select('id', { count: 'exact', head: true }).eq('assessment_id', id);
        if (error || !count) return NextResponse.json({ error: 'أضف سؤالًا واحدًا على الأقل قبل النشر.' }, { status: 400 });
      }
      patch.status = body.status;
    }
    const { data, error } = await db.from('academy_assessments').update(patch).eq('id', id).select('id,module_id,title,pass_score,max_attempts,status,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث الاختبار.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الاختبار غير موجود.' }, { status: 404 });
    return NextResponse.json({ assessment: data });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
