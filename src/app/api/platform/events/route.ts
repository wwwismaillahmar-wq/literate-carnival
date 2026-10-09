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
    .select('id,event_name,aggregate_type,aggregate_id,status,attempts,available_at,created_at,processed_at,last_error')
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
