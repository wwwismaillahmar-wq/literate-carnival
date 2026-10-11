import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowed, error: authError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (authError || allowed !== true) return NextResponse.json({ error: 'عرض كتالوج الإدارة غير مصرح.' }, { status: 403 });
  const { data, error } = await db.from('courses').select('*').limit(100);
  if (error) return NextResponse.json({ error: 'تعذر تحميل الدورات؛ تحقق من مخطط courses الحالي.' }, { status: 500 });
  const courses = (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    title: [row.title, row.name, row.course_name].find(value => typeof value === 'string' && value.trim()) ?? String(row.id ?? 'دورة بلا عنوان'),
    description: [row.description, row.summary].find(value => typeof value === 'string' && value.trim()) ?? '',
    status: typeof row.status === 'string' ? row.status : typeof row.published === 'boolean' ? (row.published ? 'published' : 'draft') : typeof row.active === 'boolean' ? (row.active ? 'active' : 'inactive') : 'unknown',
  })).filter(course => course.id);
  return NextResponse.json({ courses });
}


function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

async function requireAdmin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await requireAdmin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إنشاء الدورات للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const duration = typeof body.duration === 'string' ? body.duration.trim() : '';
    const price = body.priceDzd === '' || body.priceDzd == null ? null : Number(body.priceDzd);
    if (title.length < 2 || title.length > 180 || description.length > 10000 ||
        !duration || duration.length > 160 ||
        (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000000))) {
      return NextResponse.json({ error: 'أدخل عنوان الدورة ومدتها، وتحقق من الوصف والسعر.' }, { status: 400 });
    }
    const { data, error } = await db.from('courses').insert({
      title, description, duration, price_dzd: price, status: 'draft',
    }).select('id,title,description,duration,price_dzd,status,created_at,updated_at,published_at').single();
    if (error) return NextResponse.json({ error: 'تعذر إنشاء الدورة في قاعدة البيانات.' }, { status: 500 });
    return NextResponse.json({ course: data, message: 'تم إنشاء الدورة كمسودة؛ لن تظهر للمتعلمين قبل اكتمال المحتوى ونشرها.' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await requireAdmin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تعديل الدورات للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: 'معرّف الدورة غير صالح.' }, { status: 400 });
    }
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length < 2 || body.title.trim().length > 180) return NextResponse.json({ error: 'عنوان الدورة غير صالح.' }, { status: 400 });
      patch.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.trim().length > 10000) return NextResponse.json({ error: 'وصف الدورة غير صالح.' }, { status: 400 });
      patch.description = body.description.trim();
    }
    if (body.duration !== undefined) {
      if (typeof body.duration !== 'string' || !body.duration.trim() || body.duration.trim().length > 160) return NextResponse.json({ error: 'مدة الدورة غير صالحة.' }, { status: 400 });
      patch.duration = body.duration.trim();
    }
    if (body.priceDzd !== undefined) {
      const price = body.priceDzd === '' || body.priceDzd == null ? null : Number(body.priceDzd);
      if (price !== null && (!Number.isFinite(price) || price < 0 || price > 1000000000)) return NextResponse.json({ error: 'سعر الدورة غير صالح.' }, { status: 400 });
      patch.price_dzd = price;
    }
    if (body.status !== undefined) {
      if (!['draft','published','archived'].includes(body.status)) return NextResponse.json({ error: 'حالة الدورة غير صالحة.' }, { status: 400 });
      if (body.status === 'published') {
        const { data: modules, error: modulesError } = await db.from('academy_modules').select('id').eq('course_id', id).eq('status', 'published');
        if (modulesError) return NextResponse.json({ error: 'تعذر التحقق من وحدات الدورة.' }, { status: 500 });
        const moduleIds = (modules ?? []).map((module: { id: string }) => module.id);
        if (!moduleIds.length) return NextResponse.json({ error: 'لا يمكن نشر دورة بلا وحدة منشورة واحدة على الأقل.' }, { status: 400 });
        const { count, error: lessonsError } = await db.from('academy_lessons').select('id', { count: 'exact', head: true }).in('module_id', moduleIds).eq('status', 'published');
        if (lessonsError) return NextResponse.json({ error: 'تعذر التحقق من دروس الدورة.' }, { status: 500 });
        if (!count) return NextResponse.json({ error: 'لا يمكن نشر دورة بلا درس منشور واحد على الأقل.' }, { status: 400 });
        patch.published_at = new Date().toISOString();
      } else if (body.status === 'draft') {
        patch.published_at = null;
      }
      patch.status = body.status;
    }
    const { data, error } = await db.from('courses').update(patch).eq('id', id)
      .select('id,title,description,duration,price_dzd,status,created_at,updated_at,published_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر حفظ تغييرات الدورة.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الدورة غير موجودة.' }, { status: 404 });
    return NextResponse.json({ course: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
