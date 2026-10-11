import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

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
  if (!allowed) return NextResponse.json({ error: 'إدارة العملاء المحتملين للإدارة فقط.' }, { status: 403 });
  const [{ data: users, error: usersError }, { data: leads, error: leadsError }] = await Promise.all([
    db.from('profiles').select('id,full_name,username').order('full_name').limit(500),
    db.from('leads').select('id,status,assigned_to,updated_at').order('created_at', { ascending: false }).limit(200),
  ]);
  if (usersError || leadsError) return NextResponse.json({ error: 'تعذر تحميل بيانات التعيين والعملاء.' }, { status: 500 });
  return NextResponse.json({ users: users ?? [], leads: leads ?? [] });
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تحديث العملاء المحتملين للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const leadId = typeof body.leadId === 'number' ? body.leadId : Number(body.leadId);
    const status = typeof body.status === 'string' ? body.status : '';
    const assignedTo = body.assignedTo === null || body.assignedTo === '' ? null : typeof body.assignedTo === 'string' ? body.assignedTo : 'invalid';
    if (!Number.isSafeInteger(leadId) || leadId <= 0 || !['new','contacted','qualified','closed'].includes(status) ||
      (assignedTo !== null && (typeof assignedTo !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assignedTo)))) {
      return NextResponse.json({ error: 'بيانات الحالة أو التعيين غير صالحة.' }, { status: 400 });
    }
    const { data, error } = await db.rpc('admin_update_crm_lead', { p_lead_id: leadId, p_status: status, p_assigned_to: assignedTo });
    if (error) {
      const message = error.message.includes('LEAD_NOT_FOUND') ? 'العميل غير موجود.' : error.message.includes('LEAD_ASSIGNEE_NOT_FOUND') ? 'المستخدم المحدد غير موجود.' : 'تعذر حفظ حالة العميل والتعيين.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const lead = Array.isArray(data) ? data[0] : data;
    if (!lead) return NextResponse.json({ error: 'لم تُرجع قاعدة البيانات نتيجة التحديث.' }, { status: 500 });
    return NextResponse.json({ lead });
  } catch { return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 }); }
}
