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

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function GET(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إدارة وحدات الدورات للإدارة فقط.' }, { status: 403 });
  const courseId = new URL(request.url).searchParams.get('courseId')?.trim() ?? '';
  if (!courseId || courseId.length > 120) return NextResponse.json({ error: 'معرّف الدورة مطلوب.' }, { status: 400 });
  const { data, error } = await db.from('academy_modules').select('id,course_id,title,description,sort_order,status,created_at,updated_at')
    .eq('course_id', courseId).order('sort_order').order('created_at');
  if (error) return NextResponse.json({ error: 'تعذر تحميل وحدات الدورة.' }, { status: 500 });
  return NextResponse.json({ modules: data ?? [] });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إنشاء الوحدات للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : String(body.courseId ?? '').trim();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const sortOrder = Number.isInteger(body.sortOrder) ? body.sortOrder : 0;
    if (!courseId || courseId.length > 120 || title.length < 2 || title.length > 180 || description.length > 2000 || sortOrder < 0 || sortOrder > 100000) {
      return NextResponse.json({ error: 'بيانات الوحدة غير صالحة.' }, { status: 400 });
    }
    const { data: course, error: courseError } = await db.from('courses').select('id').eq('id', courseId).maybeSingle();
    if (courseError) return NextResponse.json({ error: 'تعذر التحقق من الدورة؛ تحقق من مخطط courses الحالي.' }, { status: 500 });
    if (!course) return NextResponse.json({ error: 'الدورة غير موجودة.' }, { status: 404 });
    const { data, error } = await db.from('academy_modules').insert({
      course_id: courseId, title, description, sort_order: sortOrder,
      status: body.status === 'published' ? 'published' : 'draft', created_by: user.id,
    }).select('id,course_id,title,description,sort_order,status,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الوحدة.' }, { status: 500 });
    return NextResponse.json({ module: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تعديل الوحدات للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الوحدة غير صالح.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 180) return NextResponse.json({ error: 'عنوان الوحدة غير صالح.' }, { status: 400 });
      patch.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim().length > 2000) return NextResponse.json({ error: 'وصف الوحدة غير صالح.' }, { status: 400 });
      patch.description = body.description.trim();
    }
    if (body.sortOrder !== undefined) {
      if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 100000) return NextResponse.json({ error: 'ترتيب الوحدة غير صالح.' }, { status: 400 });
      patch.sort_order = body.sortOrder;
    }
    if (body.status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(body.status)) return NextResponse.json({ error: 'حالة الوحدة غير صالحة.' }, { status: 400 });
      patch.status = body.status;
    }
    const { data, error } = await db.from('academy_modules').update(patch).eq('id', id)
      .select('id,course_id,title,description,sort_order,status,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث الوحدة.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الوحدة غير موجودة.' }, { status: 404 });
    return NextResponse.json({ module: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'أرشفة الوحدات للإدارة فقط.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الوحدة غير صالح.' }, { status: 400 });
  const { data, error } = await db.from('academy_modules').update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id).select('id,status').maybeSingle();
  if (error) return NextResponse.json({ error: 'تعذر أرشفة الوحدة.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'الوحدة غير موجودة.' }, { status: 404 });
  return NextResponse.json({ module: data });
}
