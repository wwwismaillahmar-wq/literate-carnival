import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}
async function gate(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}
export async function GET() {
  const db = await createClient();
  const { user, allowed } = await gate(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إدارة تكليفات المدرسين للإدارة العليا فقط.' }, { status: 403 });
  const [courses, staff, profiles] = await Promise.all([
    db.from('courses').select('id,title,name,course_name').limit(200),
    db.from('academy_course_staff').select('id,course_id,user_id,staff_role,status,created_at').order('created_at', { ascending: false }).limit(500),
    db.from('profiles').select('id,full_name,username').order('full_name').limit(500),
  ]);
  if (courses.error || staff.error || profiles.error) return NextResponse.json({ error: 'تعذر تحميل بيانات التكليفات؛ تحقق من صلاحيات قراءة الكتالوج والملفات الشخصية.' }, { status: 500 });
  return NextResponse.json({
    courses: (courses.data ?? []).map((c: Record<string, unknown>) => ({ id: String(c.id), title: String(c.title ?? c.name ?? c.course_name ?? c.id) })),
    staff: staff.data ?? [],
    profiles: profiles.data ?? [],
  });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await gate(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'هذه العملية للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const staffRole = body.staffRole;
    if (!courseId || courseId.length > 120 || !uuid.test(userId) || !['teacher','supervisor','course_manager'].includes(staffRole)) return NextResponse.json({ error: 'اختر دورة وعضوًا ودورًا صالحًا.' }, { status: 400 });
    const { data, error } = await db.from('academy_course_staff').upsert({
      course_id: courseId, user_id: userId, staff_role: staffRole, status: 'active', assigned_by: user.id, updated_at: new Date().toISOString(),
    }, { onConflict: 'course_id,user_id' }).select('id,course_id,user_id,staff_role,status,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ التكليف. تحقق من وجود الدورة والعضو.' }, { status: 500 });
    return NextResponse.json({ assignment: data, message: 'تم حفظ التكليف.' }, { status: 201 });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await gate(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'هذه العملية للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    if (!uuid.test(String(body.id ?? '')) || !['active','inactive'].includes(body.status)) return NextResponse.json({ error: 'بيانات التكليف غير صالحة.' }, { status: 400 });
    const { data, error } = await db.from('academy_course_staff').update({ status: body.status, updated_at: new Date().toISOString() }).eq('id', body.id).select('id,status').single();
    if (error) return NextResponse.json({ error: 'تعذر تحديث التكليف.' }, { status: 500 });
    return NextResponse.json({ assignment: data });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
