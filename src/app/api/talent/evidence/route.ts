import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const types = new Set(['training', 'project', 'experience', 'certificate', 'assessment']);
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
  if (!allowed) return NextResponse.json({ error: 'مراجعة الأدلة المهنية للإدارة فقط.' }, { status: 403 });
  const { data, error } = await db.from('talent_evidence')
    .select('id,profile_id,owner_id,title,evidence_type,evidence_url,notes,verification_status,created_at,talent_profiles(headline,user_id)')
    .order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'تعذر تحميل الأدلة المهنية.' }, { status: 500 });
  return NextResponse.json({ evidence: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const body = await request.json();
    const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const evidenceType = typeof body.evidenceType === 'string' ? body.evidenceType : '';
    const evidenceUrl = typeof body.evidenceUrl === 'string' ? body.evidenceUrl.trim() : '';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    if (!validUuid.test(profileId) || title.length < 2 || title.length > 180 || !types.has(evidenceType) || notes.length > 2000 || evidenceUrl.length > 2048) {
      return NextResponse.json({ error: 'بيانات الدليل المهني غير صالحة.' }, { status: 400 });
    }
    if (evidenceUrl) {
      try { if (!['http:', 'https:'].includes(new URL(evidenceUrl).protocol)) throw new Error(); }
      catch { return NextResponse.json({ error: 'رابط الدليل يجب أن يكون HTTP أو HTTPS.' }, { status: 400 }); }
    }
    const { data: profile, error: profileError } = await db.from('talent_profiles').select('id,user_id').eq('id', profileId).eq('user_id', user.id).maybeSingle();
    if (profileError) return NextResponse.json({ error: 'تعذر التحقق من الملف المهني.' }, { status: 500 });
    if (!profile) return NextResponse.json({ error: 'الملف المهني غير موجود أو لا يتبع هذا الحساب.' }, { status: 404 });
    const { data, error } = await db.from('talent_evidence').insert({
      profile_id: profile.id,
      owner_id: user.id,
      title,
      evidence_type: evidenceType,
      evidence_url: evidenceUrl || null,
      notes,
      verification_status: 'unverified',
      verified_by: null,
      verified_at: null,
    }).select('id,title,evidence_type,evidence_url,notes,verification_status,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الدليل المهني.' }, { status: 500 });
    return NextResponse.json({ evidence: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'التحقق من الأدلة المهنية للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status : '';
    if (!validUuid.test(id) || !['verified', 'rejected', 'unverified'].includes(status)) {
      return NextResponse.json({ error: 'معرّف الدليل أو حالة التحقق غير صالحة.' }, { status: 400 });
    }
    const { data, error } = await db.from('talent_evidence').update({
      verification_status: status,
      verified_by: status === 'unverified' ? null : user.id,
      verified_at: status === 'unverified' ? null : new Date().toISOString(),
    }).eq('id', id).select('id,verification_status,verified_by,verified_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث حالة الدليل.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الدليل غير موجود.' }, { status: 404 });
    return NextResponse.json({ evidence: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
