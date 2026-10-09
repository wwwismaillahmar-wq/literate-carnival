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
  if (!allowed) return NextResponse.json({ error: 'مراجعة الملفات المهنية للإدارة فقط.' }, { status: 403 });
  const { data, error } = await db.from('talent_profiles')
    .select('id,user_id,headline,bio,skills,public_profile,review_status,reviewed_by,reviewed_at,created_at,updated_at')
    .order('updated_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'تعذر تحميل الملفات المهنية.' }, { status: 500 });
  return NextResponse.json({ profiles: data ?? [] });
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'توثيق الملفات المهنية للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status : '';
    if (!validUuid.test(id) || !['verified', 'rejected', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'معرّف الملف أو حالة المراجعة غير صالحة.' }, { status: 400 });
    }
    const { data, error } = await db.from('talent_profiles').update({
      review_status: status,
      reviewed_by: status === 'pending' ? null : user.id,
      reviewed_at: status === 'pending' ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id,user_id,headline,public_profile,review_status,reviewed_by,reviewed_at,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر حفظ قرار المراجعة.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الملف المهني غير موجود.' }, { status: 404 });
    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
