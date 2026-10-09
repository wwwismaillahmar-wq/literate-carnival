import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
async function admin(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, allowed: !error && data === true };
}

export async function GET(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  const url = new URL(request.url);
  const category = url.searchParams.get('category')?.trim();
  const slug = url.searchParams.get('slug')?.trim();
  let query = db.from('knowledge_articles').select('id,slug,title,excerpt,body,category,status,author_id,published_at,created_at,updated_at').order('updated_at', { ascending: false }).limit(100);
  if (!allowed) query = query.eq('status', 'published');
  if (category) query = query.eq('category', category);
  if (slug) query = query.eq('slug', slug).limit(1);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل قاعدة المعرفة.' }, { status: 500 });
  return NextResponse.json({ articles: data ?? [], admin: allowed, authenticated: !!user });
}

export async function POST(request: Request) {
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'هذه العملية للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : 'general';
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
    if (!slugPattern.test(slug) || title.length < 3 || title.length > 200 || !bodyText || bodyText.length > 50000 || excerpt.length > 500 || category.length < 1 || category.length > 80) {
      return NextResponse.json({ error: 'تحقق من العنوان والرابط والمحتوى والتصنيف.' }, { status: 400 });
    }
    const now = new Date().toISOString();
    const { data, error } = await db.from('knowledge_articles').insert({
      slug, title, body: bodyText, excerpt, category, status, author_id: user.id,
      published_at: status === 'published' ? now : null, updated_at: now,
    }).select('id,slug,title,excerpt,body,category,status,published_at,created_at,updated_at').single();
    if (error) return NextResponse.json({ error: error.code === '23505' ? 'الرابط مستخدم بالفعل.' : 'تعذر حفظ المقال.' }, { status: error.code === '23505' ? 409 : 500 });
    return NextResponse.json({ article: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { user, allowed } = await admin(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    if (!allowed) return NextResponse.json({ error: 'هذه العملية للإدارة فقط.' }, { status: 403 });
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) return NextResponse.json({ error: 'معرّف المقال مطلوب.' }, { status: 400 });
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of ['title', 'excerpt', 'body', 'category'] as const) {
      if (body[key] !== undefined) {
        if (typeof body[key] !== 'string') return NextResponse.json({ error: 'صيغة الحقول غير صالحة.' }, { status: 400 });
        const value = body[key].trim();
        if ((key === 'title' && (value.length < 3 || value.length > 200)) || (key === 'excerpt' && value.length > 500) || (key === 'body' && (value.length < 1 || value.length > 50000)) || (key === 'category' && (value.length < 1 || value.length > 80))) return NextResponse.json({ error: 'أحد الحقول يتجاوز الحدود المسموحة أو أقصر من المطلوب.' }, { status: 400 });
        patch[key] = value;
      }
    }
    if (body.slug !== undefined) {
      if (typeof body.slug !== 'string' || !slugPattern.test(body.slug.trim())) return NextResponse.json({ error: 'الرابط غير صالح.' }, { status: 400 });
      patch.slug = body.slug.trim();
    }
    if (body.status !== undefined) {
      if (!['draft', 'published', 'archived'].includes(body.status)) return NextResponse.json({ error: 'حالة المقال غير صالحة.' }, { status: 400 });
      patch.status = body.status;
      patch.published_at = body.status === 'published' ? new Date().toISOString() : null;
    }
    const { data, error } = await db.from('knowledge_articles').update(patch).eq('id', id).select('id,slug,title,excerpt,body,category,status,published_at,updated_at').maybeSingle();
    if (error) return NextResponse.json({ error: 'تعذر تحديث المقال.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'المقال غير موجود.' }, { status: 404 });
    return NextResponse.json({ article: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const db = await createClient();
  const { user, allowed } = await admin(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'هذه العملية للإدارة فقط.' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'معرّف المقال مطلوب.' }, { status: 400 });
  const { data, error } = await db.from('knowledge_articles').update({ status: 'archived', updated_at: new Date().toISOString() }).eq('id', id).select('id,status').maybeSingle();
  if (error) return NextResponse.json({ error: 'تعذر أرشفة المقال.' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'المقال غير موجود.' }, { status: 404 });
  return NextResponse.json({ article: data });
}
