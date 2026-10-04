import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const allowedVisibility = new Set(['public', 'friends', 'private']);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const query = supabase
    .from('posts')
    .select('id, author_id, title, content, visibility, status, created_at, updated_at, published_at')
    .order('created_at', { ascending: false });

  const { data, error } = user
    ? await query
    : await query.eq('visibility', 'public').eq('status', 'published');

  if (error) {
    return NextResponse.json({ error: 'تعذر تحميل المنشورات.' }, { status: 500 });
  }

  return NextResponse.json({ posts: data ?? [] });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const visibility = typeof body.visibility === 'string' ? body.visibility : 'private';

    if (!title || !content || !allowedVisibility.has(visibility)) {
      return NextResponse.json({ error: 'أكمل عنوان المنشور ومحتواه وخصوصيته.' }, { status: 400 });
    }

    if (title.length > 160 || content.length > 5000) {
      return NextResponse.json({ error: 'تجاوز المنشور الحد المسموح للنص.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        title,
        content,
        visibility,
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .select('id, author_id, title, content, visibility, status, created_at, updated_at, published_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر حفظ المنشور.' }, { status: 500 });
    }

    return NextResponse.json({ post: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة المنشور.' }, { status: 400 });
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
    const postId = typeof body.postId === 'string' ? body.postId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const content = typeof body.content === 'string' ? body.content.trim() : '';
    const visibility = typeof body.visibility === 'string' ? body.visibility : '';

    if (!postId || !title || !content || !allowedVisibility.has(visibility)) {
      return NextResponse.json({ error: 'بيانات تعديل المنشور غير مكتملة.' }, { status: 400 });
    }

    if (title.length > 160 || content.length > 5000) {
      return NextResponse.json({ error: 'تجاوز المنشور الحد المسموح للنص.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('posts')
      .update({ title, content, visibility })
      .eq('id', postId)
      .eq('author_id', user.id)
      .select('id, author_id, title, content, visibility, status, created_at, updated_at, published_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'تعذر تعديل المنشور.' }, { status: 500 });
    }

    return NextResponse.json({ post: data });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة تعديل المنشور.' }, { status: 400 });
  }
}


export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const postId = new URL(request.url).searchParams.get('postId')?.trim();
    if (!postId) return NextResponse.json({ error: 'معرّف المنشور مطلوب.' }, { status: 400 });

    const { data: post, error: readError } = await supabase
      .from('posts')
      .select('id')
      .eq('id', postId)
      .eq('author_id', user.id)
      .maybeSingle();

    if (readError || !post) {
      return NextResponse.json({ error: 'المنشور غير موجود أو لا تملك صلاحية حذفه.' }, { status: 404 });
    }

    const { data: media } = await supabase
      .from('media_assets')
      .select('object_path')
      .eq('post_id', postId)
      .eq('owner_id', user.id);

    const paths = (media ?? []).map(item => item.object_path).filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('aslan-media').remove(paths);
      if (storageError) {
        return NextResponse.json({ error: 'تعذر تنظيف وسائط المنشور من التخزين.' }, { status: 500 });
      }
    }

    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);

    if (deleteError) return NextResponse.json({ error: 'تعذر حذف المنشور.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة حذف المنشور.' }, { status: 400 });
  }
}
