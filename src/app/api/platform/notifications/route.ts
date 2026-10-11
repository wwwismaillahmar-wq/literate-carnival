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
  let query = db.from('notifications').select('id,notification_type,title,body,href,read_at,created_at').eq('recipient_id', user.id).order('created_at', { ascending: false }).limit(limit);
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
    let query = db.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', user.id).is('read_at', null);
    if (!markAll) query = query.eq('id', id);
    const { data, error } = await query.select('id,read_at');
    if (error) return NextResponse.json({ error: 'تعذر حفظ حالة القراءة.' }, { status: 500 });
    return NextResponse.json({ updated: data?.length ?? 0, notifications: data ?? [] });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}


export async function POST(request: Request) {
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const { data: isAdmin, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
    if (roleError || isAdmin !== true) return NextResponse.json({ error: 'إرسال إشعار إلى حساب آخر يتطلب صلاحية الإدارة العليا.' }, { status: 403 });
    const body = await request.json();
    const recipientId = typeof body.recipientId === 'string' ? body.recipientId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const message = typeof body.body === 'string' ? body.body.trim() : '';
    const kind = typeof body.kind === 'string' ? body.kind.trim() : 'general';
    const href = typeof body.href === 'string' ? body.href.trim() : null;
    if (!recipientId || title.length < 1 || title.length > 200 || message.length > 5000 || !['order','payment','service','support','review','system'].includes(kind) || (href && (!href.startsWith('/') || href.startsWith('//')))) {
      return NextResponse.json({ error: 'بيانات الإشعار غير صالحة.' }, { status: 400 });
    }
    const { data, error } = await db.from('notifications').insert({
      recipient_id: recipientId, title, body: message, notification_type: kind, href,
    }).select('id,recipient_id,title,body,notification_type,href,created_at').single();
    if (error) return NextResponse.json({ error: 'تعذر حفظ الإشعار.' }, { status: 500 });
    return NextResponse.json({ notification: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
