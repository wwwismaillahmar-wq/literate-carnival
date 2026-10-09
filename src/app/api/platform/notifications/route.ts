import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 30) || 30));
  const unreadOnly = url.searchParams.get('unread') === 'true';
  let query = db.from('platform_notifications').select('id,kind,title,body,href,metadata,read_at,created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(limit);
  if (unreadOnly) query = query.is('read_at', null);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل الإشعارات.' }, { status: 500 });
  return NextResponse.json({ notifications: data ?? [], unread: (data ?? []).filter((n) => !n.read_at).length });
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const markAll = body.markAll === true;
    if (!id && !markAll) return NextResponse.json({ error: 'معرّف الإشعار مطلوب.' }, { status: 400 });
    let query = db.from('platform_notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null);
    if (!markAll) query = query.eq('id', id);
    const { data, error } = await query.select('id,read_at');
    if (error) return NextResponse.json({ error: 'تعذر حفظ حالة القراءة.' }, { status: 500 });
    return NextResponse.json({ updated: data?.length ?? 0, notifications: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
