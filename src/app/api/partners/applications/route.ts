import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const allowedTypes = new Set(['supplier', 'training', 'services', 'business', 'employment', 'other']);
const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function isSuperAdmin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET() {
  const db = await createClient();
  const { user, allowed } = await isSuperAdmin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول لعرض الطلبات.' }, { status: 401 });
  let query = db.from('partner_applications')
    .select('id,owner_id,contact_name,phone,email,organization_name,partnership_type,message,status,admin_note,assigned_to,created_at,updated_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (!allowed) query = query.eq('owner_id', user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل طلبات الشراكة.' }, { status: 500 });
  return NextResponse.json({ applications: data ?? [], admin: allowed });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    const body = await request.json();
    const contactName = typeof body.contactName === 'string' ? body.contactName.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const organizationName = typeof body.organizationName === 'string' ? body.organizationName.trim() : '';
    const partnershipType = typeof body.partnershipType === 'string' ? body.partnershipType : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (contactName.length < 2 || contactName.length > 120 ||
        phone.length < 6 || phone.length > 30 ||
        email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
        organizationName.length < 2 || organizationName.length > 180 ||
        !allowedTypes.has(partnershipType) || message.length < 5 || message.length > 4000) {
      return NextResponse.json({ error: 'تحقق من الاسم والهاتف واسم المؤسسة ونوع الشراكة والتفاصيل.' }, { status: 400 });
    }

    const { data, error } = await db.from('partner_applications').insert({
      owner_id: user?.id ?? null,
      contact_name: contactName,
      phone,
      email,
      organization_name: organizationName,
      partnership_type: partnershipType,
      message,
      status: 'submitted',
      admin_note: '',
      assigned_to: null,
    }).select('id,status,created_at').single();

    if (error) return NextResponse.json({ error: 'تعذر حفظ طلب الشراكة في قاعدة البيانات.' }, { status: 500 });
    return NextResponse.json({ application: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  try {
    const db = await createClient();
    const { user, allowed } = await isSuperAdmin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'تحديث طلبات الشراكة للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const status = typeof body.status === 'string' ? body.status : '';
    const adminNote = body.adminNote === undefined ? undefined : typeof body.adminNote === 'string' ? body.adminNote.trim() : null;
    const assignedTo = body.assignedTo === undefined ? undefined : body.assignedTo === null || body.assignedTo === '' ? null : typeof body.assignedTo === 'string' ? body.assignedTo.trim() : 'invalid';

    if (!validUuid.test(id) || !['submitted', 'under_review', 'approved', 'rejected', 'closed'].includes(status) ||
        adminNote === null || (typeof adminNote === 'string' && adminNote.length > 4000) ||
        assignedTo === 'invalid' || (typeof assignedTo === 'string' && !validUuid.test(assignedTo))) {
      return NextResponse.json({ error: 'بيانات التحديث غير صالحة.' }, { status: 400 });
    }

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (adminNote !== undefined) patch.admin_note = adminNote;
    if (assignedTo !== undefined) patch.assigned_to = assignedTo;
    const { data, error } = await db.from('partner_applications').update(patch).eq('id', id)
      .select('id,status,admin_note,assigned_to,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث الطلب.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'الطلب غير موجود.' }, { status: 404 });
    return NextResponse.json({ application: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
