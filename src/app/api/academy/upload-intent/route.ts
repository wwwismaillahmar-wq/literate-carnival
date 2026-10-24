import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ACADEMY_MAX_FILE_BYTES, ACADEMY_MIME_TYPES, validateAcademyUploadMetadata } from '@/lib/academy/resource-policy';

import { academyUploadBaseUrl } from '@/lib/academy/contabo-storage';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const baseUrl = academyUploadBaseUrl();
  return NextResponse.json({ backend: 'contabo', baseUrl, maxBytes: ACADEMY_MAX_FILE_BYTES },
    { status: baseUrl ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Issues a per-user, per-lesson storage upload intent.
 * Does NOT proxy bytes through Vercel. A resumable TUS client must subsequently
 * upload directly to the authenticated Contabo filesystem gateway.
 * The gateway independently enforces ownership, permission, and size.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin)
        return NextResponse.json({ error: 'مصدر غير مسموح.' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'مصدر غير صالح.' }, { status: 403 });
    }
  }
  const db = await createClient();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'يلزم تسجيل الدخول.' }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 }); }
  if (!payload || typeof payload !== 'object')
    return NextResponse.json({ error: 'طلب غير صالح.' }, { status: 400 });
  const body = payload as Record<string, unknown>;
  const lessonId = body.lessonId;
  const fileName = body.fileName;
  const sizeBytes = body.sizeBytes;
  if (typeof lessonId !== 'string' || !UUID.test(lessonId) ||
      typeof fileName !== 'string' || typeof sizeBytes !== 'number')
    return NextResponse.json({ error: 'بيانات الملف غير صالحة.' }, { status: 400 });
  const check = validateAcademyUploadMetadata(fileName, sizeBytes);
  if (!check.accepted) return NextResponse.json({ error: check.reason }, { status: 400 });
  const { data: lesson, error: lessonError } = await db.from('academy_lessons')
    .select('id,module_id,academy_modules!inner(course_id)').eq('id', lessonId).maybeSingle();
  if (lessonError || !lesson)
    return NextResponse.json({ error: 'الدرس غير موجود أو غير متاح.' }, { status: 404 });
  const courseId = (lesson.academy_modules as unknown as { course_id: string }).course_id;
  const { data: allowed, error: accessError } = await db.rpc('can_manage_academy_course', { p_course_id: courseId });
  if (accessError || allowed !== true)
    return NextResponse.json({ error: 'لا تملك صلاحية رفع محتوى هذا الدرس.' }, { status: 403 });
  // Storage RLS requires a pending asset record before any upload begins.
  const mimeType = ACADEMY_MIME_TYPES[check.extension ?? ''];
  if (!mimeType) return NextResponse.json({error:'نوع الملف غير مسموح.'},{status:400});
  const uploadBase = academyUploadBaseUrl();
  if (!uploadBase) return NextResponse.json({
    error:'عنوان بوابة رفع الخادم غير مضبوط.',code:'CONTABO_UPLOAD_NOT_CONFIGURED',
  },{status:503});
  const id = crypto.randomUUID();
  // Retain the database's immutable lesson/asset path contract.
  const path = lessonId + '/' + id;
  const {data:asset,error:assetError} = await db.from('academy_lesson_assets').insert({
    id,lesson_id:lessonId,owner_id:user.id,object_path:path,file_name:fileName,storage_backend:'contabo',
    mime_type:mimeType,file_size:sizeBytes,status:'pending',
  }).select('id').single();
  if (assetError || !asset) return NextResponse.json({error:'تعذر تسجيل الملف قبل رفعه.'},{status:500});
  return NextResponse.json({
    assetId:asset.id,
    mimeType,
    backend: 'contabo',
    endpoint: uploadBase + '/files/' + id,
    objectPath: path,
    maxBytes: ACADEMY_MAX_FILE_BYTES,
    chunkBytes: 6 * 1024 ** 2,
    protocol: 'tus-resumable',
    note: 'تُنقل الملفات مباشرة إلى خادم ASLAN، ثم يُتحقق من الحجم والبصمة قبل المراجعة.',
  });
}
