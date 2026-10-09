import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const activityTypes = new Set(['note', 'call', 'email', 'whatsapp', 'meeting', 'follow_up', 'status_change']);

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
  if (!allowed) return NextResponse.json({ error: 'سجل CRM للإدارة فقط.' }, { status: 403 });
  const rawLeadId = new URL(request.url).searchParams.get('leadId');
  const leadId = rawLeadId && /^\d+$/.test(rawLeadId) ? Number(rawLeadId) : 0;
  if (!Number.isSafeInteger(leadId) || leadId <= 0) return NextResponse.json({ error: 'معرّف العميل غير صالح.' }, { status: 400 });
  const { data, error } = await db.from('crm_lead_activities')
    .select('id,lead_id,activity_type,body,follow_up_at,created_by,created_at')
    .eq('lead_id', leadId).order('created_at', { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: 'تعذر تحميل سجل المتابعة.' }, { status: 500 });
  return NextResponse.json({ activities: data ?? [] });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'إضافة نشاط CRM للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const rawLeadId = typeof body.leadId === 'number' ? String(body.leadId) : typeof body.leadId === 'string' ? body.leadId.trim() : '';
    const leadId = /^\d+$/.test(rawLeadId) ? Number(rawLeadId) : 0;
    const activityType = typeof body.activityType === 'string' ? body.activityType : '';
    const activityBody = typeof body.body === 'string' ? body.body.trim() : '';
    const rawFollowUp = typeof body.followUpAt === 'string' ? body.followUpAt.trim() : '';
    const followUpAt = rawFollowUp ? new Date(rawFollowUp) : null;
    if (!Number.isSafeInteger(leadId) || leadId <= 0 || !activityTypes.has(activityType) ||
        activityBody.length < 1 || activityBody.length > 4000 ||
        (followUpAt && !Number.isFinite(followUpAt.getTime()))) {
      return NextResponse.json({ error: 'تحقق من العميل ونوع النشاط والتفاصيل وموعد المتابعة.' }, { status: 400 });
    }
    const { data: lead, error: leadError } = await db.from('leads').select('id').eq('id', leadId).maybeSingle();
    if (leadError) return NextResponse.json({ error: 'تعذر التحقق من سجل العميل.' }, { status: 500 });
    if (!lead) return NextResponse.json({ error: 'العميل غير موجود.' }, { status: 404 });
    const { data, error } = await db.from('crm_lead_activities').insert({
      lead_id: leadId,
      activity_type: activityType,
      body: activityBody,
      follow_up_at: followUpAt?.toISOString() ?? null,
      created_by: user.id,
    }).select('id,lead_id,activity_type,body,follow_up_at,created_by,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ نشاط المتابعة.' }, { status: 500 });
    return NextResponse.json({ activity: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
