import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowed, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || allowed !== true) return NextResponse.json({ error: 'عرض سجل المهام للإدارة العليا فقط.' }, { status: 403 });
  const { data, error } = await db.from('platform_events')
    .select('id,event_name,aggregate_type,aggregate_id,status,attempts,manual_retry_count,available_at,created_at,processed_at,last_error')
    .in('status', ['pending', 'processing', 'failed'])
    .order('created_at', { ascending: false }).limit(200);
  if (error) return NextResponse.json({ error: 'تعذر تحميل سجل المهام. تحقق من ترحيلات M08 وصلاحيات الجدول.' }, { status: 500 });
  const events = data ?? [];
  return NextResponse.json({
    events,
    summary: {
      pending: events.filter(event => event.status === 'pending').length,
      processing: events.filter(event => event.status === 'processing').length,
      failed: events.filter(event => event.status === 'failed').length,
    },
    generatedAt: new Date().toISOString(),
  });
}

export async function PATCH(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); }
    catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); }
  }
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const { data: allowed, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
    if (roleError || allowed !== true) return NextResponse.json({ error: 'إعادة المحاولة للإدارة العليا فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || reason.length < 5 || reason.length > 1000) {
      return NextResponse.json({ error: 'معرّف الحدث وسبب إعادة المحاولة مطلوبان.' }, { status: 400 });
    }
    const { data, error } = await db.rpc('admin_retry_platform_event', { p_event_id: id, p_reason: reason });
    if (error) {
      const message = error.message.includes('MANUAL_RETRY_LIMIT_REACHED') ? 'وصل الحد الأقصى لإعادات المحاولة اليدوية.' :
        error.message.includes('EVENT_NOT_FAILED') ? 'لا يمكن إعادة المحاولة إلا لحدث فاشل.' :
        error.message.includes('EVENT_NOT_FOUND') ? 'الحدث غير موجود.' : 'تعذر إعادة جدولة الحدث.';
      return NextResponse.json({ error: message }, { status: error.message.includes('MANUAL_RETRY_LIMIT_REACHED') ? 409 : 400 });
    }
    const event = Array.isArray(data) ? data[0] : data;
    if (!event) return NextResponse.json({ error: 'لم تُرجع قاعدة البيانات تأكيد إعادة المحاولة.' }, { status: 500 });
    return NextResponse.json({ event });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
