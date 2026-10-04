import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const bucket = 'aslan-media';
const allowedMediaTypes = new Set(['image', 'video', 'file']);
const allowedMime = /^(image|video|application|text|audio)\/[a-z0-9.+-]+$/i;
const maxFileSize = 50 * 1024 * 1024;

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

  const postId = new URL(request.url).searchParams.get('postId');
  const contributionId = new URL(request.url).searchParams.get('contributionId');
  const messageId = new URL(request.url).searchParams.get('messageId');

  let query = supabase
    .from('media_assets')
    .select('id, owner_id, post_id, contribution_id, bucket_id, object_path, media_type, mime_type, file_size, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (postId) query = query.eq('post_id', postId);
  if (contributionId) query = query.eq('contribution_id', contributionId);
  if (messageId) query = query.eq('message_id', messageId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل الوسائط.' }, { status: 500 });

  const assets = [];
  for (const asset of data ?? []) {
    const signed = await supabase.storage.from(bucket).createSignedUrl(asset.object_path, 3600);
    assets.push({ ...asset, signed_url: signed.data?.signedUrl ?? null });
  }

  return NextResponse.json({ media: assets });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const mediaType = typeof body.mediaType === 'string' ? body.mediaType : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;
    const postId = typeof body.postId === 'string' ? body.postId.trim() : null;
    const contributionId = typeof body.contributionId === 'string' ? body.contributionId.trim() : null;
    const messageId = typeof body.messageId === 'string' ? body.messageId.trim() : null;

    if (!allowedMediaTypes.has(mediaType) || !allowedMime.test(mimeType)) {
      return NextResponse.json({ error: 'نوع الوسائط غير مسموح.' }, { status: 400 });
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maxFileSize) {
      return NextResponse.json({ error: 'حجم الملف غير صالح أو يتجاوز 50MB.' }, { status: 400 });
    }
    if ((postId && contributionId) || (postId && messageId) || (contributionId && messageId) || (!postId && !contributionId && !messageId)) {
      return NextResponse.json({ error: 'يجب ربط الوسائط بمنشور أو مساهمة أو رسالة واحدة.' }, { status: 400 });
    }

    if (postId) {
      const { data: post } = await supabase.from('posts').select('id').eq('id', postId).eq('author_id', user.id).maybeSingle();
      if (!post) return NextResponse.json({ error: 'المنشور غير موجود أو غير مملوك للحساب.' }, { status: 404 });
    }
    if (contributionId) {
      const { data: contribution } = await supabase.from('contributions').select('id').eq('id', contributionId).eq('user_id', user.id).maybeSingle();
      if (!contribution) return NextResponse.json({ error: 'المساهمة غير موجودة أو غير مملوكة للحساب.' }, { status: 404 });
    }
    if (messageId) {
      const { data: message } = await supabase.from('messages').select('id,conversation_id').eq('id', messageId).maybeSingle();
      if (!message) return NextResponse.json({ error: 'الرسالة غير موجودة.' }, { status: 404 });
      const { data: conversation } = await supabase.from('conversations').select('participant_a,participant_b').eq('id', message.conversation_id).maybeSingle();
      if (!conversation || ![conversation.participant_a,conversation.participant_b].includes(user.id)) return NextResponse.json({ error: 'لا تملك صلاحية إرفاق ملف بهذه الرسالة.' }, { status: 403 });
    }

    const extension = mimeType.split('/')[1].replace(/[^a-z0-9]+/gi, '').toLowerCase() || 'bin';
    const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`;

    const { data: signedUpload, error: uploadError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (uploadError || !signedUpload) {
      return NextResponse.json({ error: 'تعذر إنشاء رابط رفع الوسائط.' }, { status: 500 });
    }

    const { data: asset, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        owner_id: user.id,
        post_id: postId,
        contribution_id: contributionId,
        message_id: messageId,
        bucket_id: bucket,
        object_path: objectPath,
        media_type: mediaType,
        mime_type: mimeType,
        file_size: fileSize,
      })
      .select('id, owner_id, post_id, contribution_id, bucket_id, object_path, media_type, mime_type, file_size, created_at')
      .single();

    if (assetError) {
      return NextResponse.json({ error: 'تعذر تسجيل الوسائط.' }, { status: 500 });
    }

    return NextResponse.json({
      asset,
      upload: {
        path: signedUpload.path,
        token: signedUpload.token,
      },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة الوسائط.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const assetId = new URL(request.url).searchParams.get('assetId')?.trim();
    if (!assetId) return NextResponse.json({ error: 'معرّف الوسائط مطلوب.' }, { status: 400 });

    const { data: asset, error: readError } = await supabase
      .from('media_assets')
      .select('id, object_path')
      .eq('id', assetId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (readError || !asset) return NextResponse.json({ error: 'الوسائط غير موجودة.' }, { status: 404 });

    const { error: storageError } = await supabase.storage.from(bucket).remove([asset.object_path]);
    if (storageError) return NextResponse.json({ error: 'تعذر حذف الملف من التخزين.' }, { status: 500 });

    const { error: dbError } = await supabase.from('media_assets').delete().eq('id', assetId).eq('owner_id', user.id);
    if (dbError) return NextResponse.json({ error: 'تم حذف الملف لكن تعذر حذف سجله.' }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'تعذر حذف الوسائط.' }, { status: 400 });
  }
}
