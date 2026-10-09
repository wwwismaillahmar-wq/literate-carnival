import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
const maxSize = 2 * 1024 * 1024;
const allowed = new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp']]);

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data: allowedAdmin, error: roleError } = await db.rpc('has_role', { role_key: 'super_admin' });
  if (roleError || allowedAdmin !== true) return NextResponse.json({ error: 'رفع شعار الموقع للإدارة العليا فقط.' }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: 'تعذر قراءة ملف الشعار.' }, { status: 400 }); }
  const file = form.get('file');
  if (!(file instanceof File) || file.size <= 0 || file.size > maxSize || !allowed.has(file.type)) {
    return NextResponse.json({ error: 'اختر صورة PNG أو JPEG أو WebP لا تتجاوز 2MB.' }, { status: 400 });
  }

  const bucket = 'aslan-media';
  const objectPath = user.id + '/brand/' + crypto.randomUUID() + '.' + allowed.get(file.type);
  const { data: previous } = await db.from('site_settings').select('setting_value').eq('setting_key','brand_logo_path').maybeSingle();
  const oldPath = previous?.setting_value ?? '';
  const { error: uploadError } = await db.storage.from(bucket).upload(objectPath, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: 'تعذر رفع الشعار إلى التخزين.' }, { status: 500 });

  const { error: saveError } = await db.from('site_settings').upsert({
    setting_key: 'brand_logo_path', setting_value: objectPath, is_public: true,
    updated_by: user.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'setting_key' });
  if (saveError) {
    await db.storage.from(bucket).remove([objectPath]);
    return NextResponse.json({ error: 'رُفع الملف لكن تعذر حفظ مساره؛ أُلغيت عملية الرفع.' }, { status: 500 });
  }

  let oldAssetCleanupWarning = false;
  if (oldPath && oldPath !== objectPath && (oldPath.startsWith('brand/') || oldPath.includes('/brand/'))) {
    const { error } = await db.storage.from(bucket).remove([oldPath]);
    oldAssetCleanupWarning = Boolean(error);
  }
  const url = db.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
  return NextResponse.json({ logoPath: objectPath, logoUrl: url, oldAssetCleanupWarning });
}
