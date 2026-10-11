import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: isAdmin, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || isAdmin !== true) return NextResponse.json({ error: 'غير مصرح بقراءة التقارير.' }, { status: 403 });
  const url = new URL(request.url);
  const days = Math.max(1, Math.min(90, Number(url.searchParams.get('days') ?? 30) || 30));
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error, count } = await db.from('analytics_events').select('event_name,path,created_at', { count: 'exact' }).gte('created_at', since).order('created_at', { ascending: false }).limit(5000);
  if (error) return NextResponse.json({ error: 'تعذر قراءة أحداث التحليلات.' }, { status: 500 });
  const grouped = new Map<string, number>();
  const paths = new Map<string, number>();
  for (const event of data ?? []) {
    grouped.set(event.event_name, (grouped.get(event.event_name) ?? 0) + 1);
    if (event.path) paths.set(event.path, (paths.get(event.path) ?? 0) + 1);
  }
  return NextResponse.json({
    periodDays: days, since, eventCount: count ?? data?.length ?? 0,
    events: [...grouped].map(([name, value]) => ({ name, count: value })).sort((a, b) => b.count - a.count),
    paths: [...paths].map(([path, value]) => ({ path, count: value })).sort((a, b) => b.count - a.count).slice(0, 100),
    truncated: (count ?? 0) > (data?.length ?? 0),
  });
}
