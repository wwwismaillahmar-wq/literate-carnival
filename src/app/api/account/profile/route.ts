import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const bucket = 'aslan-media';
const maxAvatarSize = 5 * 1024 * 1024;

function safeUsername(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_path, role, message_privacy, created_at')
    .eq('id', user.id)
    .single();

  if (error) return NextResponse.json({ error: 'تعذر تحميل الملف الشخصي.' }, { status: 500 });

  let avatar_url: string | null = null;
  if (profile.avatar_path) {
    const signed = await supabase.storage.from(bucket).createSignedUrl(profile.avatar_path, 3600);
    avatar_url = signed.data?.signedUrl ?? null;
  }

  return NextResponse.json({ profile: { ...profile, avatar_url } });
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 120) : undefined;
    const username = body.username !== undefined ? safeUsername(body.username) : undefined;
    const messagePrivacy = body.messagePrivacy !== undefined ? String(body.messagePrivacy) : undefined;
    const allowedPrivacy = new Set(['members_only','all_members','community','friends']);
    if (messagePrivacy !== undefined && !allowedPrivacy.has(messagePrivacy)) return NextResponse.json({ error: 'إعداد المراسلة غير صالح.' }, { status: 400 });

    if (username !== undefined && username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json({ error: 'اسم المستخدم يجب أن يكون 3–30 حرفًا: a-z أو 0-9 أو _.' }, { status: 400 });
    }

    const patch: Record<string, string | null> = {};
    if (fullName !== undefined) patch.full_name = fullName || null;
    if (username !== undefined) patch.username = username || null;
    if (messagePrivacy !== undefined) patch.message_privacy = messagePrivacy;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: 'لا توجد بيانات لتعديلها.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', user.id)
      .select('id, full_name, username, avatar_path, role, created_at')
      .single();

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'اسم المستخدم مستخدم بالفعل.' }, { status: 409 });
      return NextResponse.json({ error: 'تعذر تحديث الملف الشخصي.' }, { status: 500 });
    }

    return NextResponse.json({ profile: data });
  } catch {
    return NextResponse.json({ error: 'تعذر معالجة الملف الشخصي.' }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType : '';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;

    if (!/^image\/(jpeg|png|webp|gif)$/i.test(mimeType)) {
      return NextResponse.json({ error: 'صورة الملف الشخصي يجب أن تكون JPG أو PNG أو WEBP أو GIF.' }, { status: 400 });
    }
    if (!Number.isInteger(fileSize) || fileSize <= 0 || fileSize > maxAvatarSize) {
      return NextResponse.json({ error: 'حجم صورة الملف الشخصي يجب ألا يتجاوز 5MB.' }, { status: 400 });
    }

    const extension = mimeType.split('/')[1].toLowerCase();
    const objectPath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;

    const { data: signedUpload, error: uploadError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath);

    if (uploadError || !signedUpload) {
      return NextResponse.json({ error: 'تعذر إنشاء رابط رفع صورة الحساب.' }, { status: 500 });
    }

    return NextResponse.json({ upload: signedUpload, objectPath });
  } catch {
    return NextResponse.json({ error: 'تعذر تجهيز صورة الحساب.' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول أولًا.' }, { status: 401 });

    const body = await request.json();
    const avatarPath = typeof body.avatarPath === 'string' ? body.avatarPath : '';
    if (!avatarPath.startsWith(`avatars/${user.id}/`)) {
      return NextResponse.json({ error: 'مسار صورة الحساب غير صالح.' }, { status: 400 });
    }

    const { data: old } = await supabase.from('profiles').select('avatar_path').eq('id', user.id).single();
    const { error } = await supabase.from('profiles').update({ avatar_path: avatarPath }).eq('id', user.id);
    if (error) return NextResponse.json({ error: 'تعذر حفظ صورة الحساب.' }, { status: 500 });

    if (old?.avatar_path && old.avatar_path !== avatarPath) {
      await supabase.storage.from(bucket).remove([old.avatar_path]);
    }

    const signed = await supabase.storage.from(bucket).createSignedUrl(avatarPath, 3600);
    return NextResponse.json({ avatar_url: signed.data?.signedUrl ?? null });
  } catch {
    return NextResponse.json({ error: 'تعذر تحديث صورة الحساب.' }, { status: 400 });
  }
}
