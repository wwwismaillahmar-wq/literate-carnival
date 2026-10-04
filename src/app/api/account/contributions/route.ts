import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedTypes = new Set(['suggestion', 'design', 'model', 'post']);
const allowedVisibility = new Set(['public', 'friends', 'private']);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('contributions')
    .select('id, user_id, type, title, content, visibility, status, created_at, updated_at, published_at, featured, featured_at, featured_by, featured_order')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'تعذر تحميل المساهمات.' }, { status: 500 });
  }

  return NextResponse.json({ contributions: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const type = typeof body.type === 'string' ? body.type : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const visibility = typeof body.visibility === 'string' ? body.visibility : 'private';

    if (!allowedTypes.has(type) || !title || !content || !allowedVisibility.has(visibility)) {
      return NextResponse.json({ error: 'أكمل نوع المساهمة والعنوان والمحتوى والخصوصية.' }, { status: 400 });
    }

    if (title.length > 160 || content.length > 5000) {
      return NextResponse.json({ error: 'تجاوزت المساهمة الحد المسموح للنص.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contributions')
      .insert({
        user_id: user.id,
        type,
        title,
        content,
        visibility,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id, user_id, type, title, content, visibility, status, created_at, updated_at, published_at, featured, featured_at, featured_by, featured_order')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر حفظ المساهمة.' }, { status: 500 });
    }

    return NextResponse.json({ contribution: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة المساهمة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const contributionId = typeof body.contributionId === 'string' ? body.contributionId.trim() : '';
    const type = typeof body.type === 'string' ? body.type : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const visibility = typeof body.visibility === 'string' ? body.visibility : '';

    if (!contributionId || !allowedTypes.has(type) || !title || !content || !allowedVisibility.has(visibility)) {
      return NextResponse.json({ error: 'بيانات تعديل المساهمة غير مكتملة.' }, { status: 400 });
    }

    if (title.length > 160 || content.length > 5000) {
      return NextResponse.json({ error: 'تجاوزت المساهمة الحد المسموح للنص.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contributions')
      .update({ type, title, content, visibility })
      .eq('id', contributionId)
      .eq('user_id', user.id)
      .select('id, user_id, type, title, content, visibility, status, created_at, updated_at, published_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر تعديل المساهمة.' }, { status: 500 });
    }

    return NextResponse.json({ contribution: data });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة تعديل المساهمة.' }, { status: 400 });
  }
}
