import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (error: string, status: number) => NextResponse.json({ error }, { status });
function originAllowed(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}
async function admin() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, status: 401 };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { db, status: error || data !== true ? 403 : 200, user };
}
export async function GET(request: Request) {
  const { db, status } = await admin();
  if (status !== 200) return json('غير مصرح.', status);
  const courseId = new URL(request.url).searchParams.get('courseId') ?? '';
  if (!uuid.test(courseId)) return json('معرّف الدورة غير صالح.', 400);
  const { data, error } = await db.from('academy_course_testers')
    .select('user_id,granted_at').eq('course_id', courseId).order('granted_at', { ascending: false });
  if (error) return json('تعذر تحميل المختبرين.', 500);
  return NextResponse.json({ testers: data ?? [] });
}
export async function POST(request: Request) {
  if (!originAllowed(request)) return json('مصدر غير مسموح.', 403);
  const { db, status, user } = await admin();
  if (status !== 200 || !user) return json('غير مصرح.', status);
  let body: { courseId?: string; userId?: string };
  try { body = await request.json(); } catch { return json('طلب غير صالح.', 400); }
  if (!uuid.test(body.courseId ?? '') || !uuid.test(body.userId ?? '')) return json('المعرّفات غير صالحة.', 400);
  const { data, error } = await db.from('academy_course_testers')
    .upsert({ course_id: body.courseId, user_id: body.userId, granted_by: user.id }, { onConflict: 'course_id,user_id' })
    .select('user_id,granted_at').single();
  if (error) return json('تعذر منح الصلاحية. تأكد من وجود حساب المستخدم.', 400);
  return NextResponse.json({ tester: data });
}
export async function DELETE(request: Request) {
  if (!originAllowed(request)) return json('مصدر غير مسموح.', 403);
  const { db, status } = await admin();
  if (status !== 200) return json('غير مصرح.', status);
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId') ?? '';
  const userId = searchParams.get('userId') ?? '';
  if (!uuid.test(courseId) || !uuid.test(userId)) return json('المعرّفات غير صالحة.', 400);
  const { error } = await db.from('academy_course_testers').delete().eq('course_id', courseId).eq('user_id', userId);
  if (error) return json('تعذر إلغاء الصلاحية.', 500);
  return NextResponse.json({ removed: true });
}
