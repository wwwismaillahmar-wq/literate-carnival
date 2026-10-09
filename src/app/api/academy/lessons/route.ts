import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lessonTypes = new Set(['text', 'video', 'document', 'link']);

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
  if (!allowed) return NextResponse.json({ error: 'إدارة الدروس للإدارة فقط.' }, { status: 403 });
  const moduleId = new URL(request.url).searchParams.get('moduleId')?.trim() ?? '';
  if (!validUuid.test(moduleId)) return NextResponse.json({ error: 'معرّف الوحدة غير صالح.' }, { status: 400 });
  const { data, error } = await db.from('academy_lessons').select('id,module_id,title,lesson_type,body,resource_url,duration_minutes,sort_order,status,created_at,updated_at')
    .eq('module_id', moduleId).order('sort_order').order('created_at');
  if (error) return NextResponse.json({ error: 'تعذر تحميل الدروس.' }, { status: 500 });
  return NextResponse.json({ lessons: data ?? [] });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إنشاء الدروس للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const moduleId = typeof body.moduleId === 'string' ? body.moduleId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const lessonType = typeof body.lessonType === 'string' ? body.lessonType : 'text';
    const lessonBody = typeof body.body === 'string' ? body.body.trim() : '';
    const resourceUrl = typeof body.resourceUrl === 'string' ? body.resourceUrl.trim() : '';
    const duration = body.durationMinutes === undefined ? 0 : body.durationMinutes;
    const sortOrder = body.sortOrder === undefined ? 0 : body.sortOrder;
    if (!validUuid.test(moduleId) || title.length < 2 || title.length > 180 || !lessonTypes.has(lessonType) ||
        lessonBody.length > 50000 || resourceUrl.length > 2048 ||
        (resourceUrl && !/^https?:\/\//i.test(resourceUrl)) ||
        !Number.isInteger(duration) || duration < 0 || duration > 1440 ||
        !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
      return NextResponse.json({ error: 'بيانات الدرس غير صالحة.' }, { status: 400 });
    }
    const { data: moduleRow, error: moduleError } = await db.from('academy_modules').select('id').eq('id', moduleId).maybeSingle();
    if (moduleError) return NextResponse.json({ error: 'تعذر التحقق من الوحدة.' }, { status: 500 });
    if (!moduleRow) return NextResponse.json({ error: 'الوحدة غير موجودة.' }, { status: 404 });
    const { data, error } = await db.from('academy_lessons').insert({
      module_id: moduleId, title, lesson_type: lessonType, body: lessonBody,
      resource_url: resourceUrl || null, duration_minutes: duration, sort_order: sortOrder,
      status: body.status === 'published' ? 'published' : 'draft',
    }).select('id,module_id,title,lesson_type,body,resource_url,duration_minutes,sort_order,status,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الدرس.' }, { status: 500 });
    return NextResponse.json({ lesson: data }, { status: 201 });
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
    if (!allowed) return NextResponse.json({ error: 'تعديل الدروس للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الدرس غير صالح.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 180) return NextResponse.json({ error: 'عنوان الدرس غير صالح.' }, { status: 400 });
      patch.title = body.title.trim();
    }
    if (body.body !== undefined) {
      if (typeof body.body !== 'string' || body.body.trim().length > 50000) return NextResponse.json({ error: 'محتوى الدرس غير صالح.' }, { status: 400 });
      patch.body = body.body.trim();
    }
    if (body.lessonType !== undefined) {
      if (typeof body.lessonType !== 'string' || !lessonTypes.has(body.lessonType)) return NextResponse.json({ error: 'نوع الدرس غير صالح.' }, { status: 400 });
      patch.lesson_type = body.lessonType;
    }
    if (body.resourceUrl !== undefined) {
      if (typeof body.resourceUrl !== 'string' || body.resourceUrl.length > 2048 || (body.resourceUrl && !/^https?:\/\//i.test(body.resourceUrl))) return NextResponse.json({ error: 'رابط المورد غير صالح.' }, { status: 400 });
      patch.resource_url = body.resourceUrl || null;
    }
    if (body.durationMinutes !== undefined) {
      if (!Number.isInteger(body.durationMinutes) || body.durationMinutes < 0 || body.durationMinutes > 1440) return NextResponse.json({ error: 'مدة الدرس غير صالحة.' }, { status: 400 });
      patch.duration_minutes = body.durationMinutes;
    }
    if (body.sortOrder !== undefined) {
      if (!Number.isInteger(body.sortOrder) || body.sortOrder < 0 || body.sortOrder > 100000) return NextResponse.json({ error: 'ترتيب الدرس غير صالح.' }, { status: 400 });
      patch.sort_order = body.sortOrder;
    }
    if (body.status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(body.status)) return NextResponse.json({ error: 'حالة الدرس غير صالحة.' }, { status: 400 });
      patch.status = body.status;
    }
    const { data, error } = await db.from('academy_lessons').update(patch).eq('id', id)
      .select('id,module_id,title,lesson_type,body,resource_url,duration_minutes,sort_order,status,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث الدرس.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الدرس غير موجود.' }, { status: 404 });
    return NextResponse.json({ lesson: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'أرشفة الدروس للإدارة فقط.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!validUuid.test(id)) return NextResponse.json({ error: 'معرّف الدرس غير صالح.' }, { status: 400 });
  const { data, error } = await db.from('academy_lessons').update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id).select('id,status').maybeSingle();
  if (error) return NextResponse.json({ error: 'تعذر أرشفة الدرس.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'الدرس غير موجود.' }, { status: 404 });
  return NextResponse.json({ lesson: data });
}
