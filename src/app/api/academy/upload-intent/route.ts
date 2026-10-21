import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ACADEMY_MAX_FILE_BYTES, validateAcademyUploadMetadata } from '@/lib/academy/resource-policy';

export const dynamic = 'force-dynamic';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Issues a per-user, per-lesson storage upload intent.
 * Does NOT proxy bytes through Vercel. A resumable TUS client must subsequently
 * upload directly to Supabase Storage using an authenticated session.
 * Storage policies MUST enforce owner/path/size constraints independently.
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
  const mime: Record<string,string> = {
    mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v',
    mkv:'video/x-matroska',avi:'video/x-msvideo',
    mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',aac:'audio/aac',
    ogg:'audio/ogg',flac:'audio/flac',
    pdf:'application/pdf',doc:'application/msword',
    docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt:'text/plain',rtf:'application/rtf',odt:'application/vnd.oasis.opendocument.text',
    ppt:'application/vnd.ms-powerpoint',
    pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odp:'application/vnd.oasis.opendocument.presentation',
    xls:'application/vnd.ms-excel',
    xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv:'text/csv',ods:'application/vnd.oasis.opendocument.spreadsheet',
    jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',
    gif:'image/gif',svg:'image/svg+xml',json:'application/json',xml:'application/xml',
    html:'text/html',css:'text/css',js:'text/javascript',zip:'application/zip',
  };
  const mimeType = mime[check.extension ?? ''];
  if (!mimeType) return NextResponse.json({error:'امتداد الملف غير مفعّل بعد في مخزن الأكاديمية.',code:'MIME_NOT_ENABLED'},{status:409});

  // Temporary preflight matching the verified aslan-academy bucket MIME allowlist
  // (20 Oct 2026). This does not replace the planned 37-extension policy.
  // Reconcile with storage.buckets before changing the live bucket configuration.
  const enabledStorageMimeTypes = new Set([
    'video/mp4', 'video/webm', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg', 'image/png', 'image/webp', 'text/plain',
  ]);
  if (!enabledStorageMimeTypes.has(mimeType)) {
    return NextResponse.json({
      error: 'صيغة الملف مدعومة في خطة الأكاديمية، لكنها غير مفعّلة في التخزين الحالي.',
      code: 'STORAGE_MIME_NOT_ENABLED',
    }, { status: 409 });
  }
  // This value is a deployment configuration ceiling, not a promise that the provider accepts 8 GiB.
  // Keep at the verified live 50 MiB cap until the provider and bucket are upgraded.
  const currentStorageLimit = 50 * 1024 * 1024;
  if (sizeBytes > currentStorageLimit) return NextResponse.json({
    error:'حد التخزين الحالي 50 MiB؛ يجب زيادة سعة المخزن قبل رفع هذا الملف.',
    code:'STORAGE_LIMIT',currentLimitBytes:currentStorageLimit,
  },{status:409});
  const path = [user.id, courseId, lessonId, crypto.randomUUID() + '.' + check.extension].join('/');
  const {data:asset,error:assetError} = await db.from('academy_lesson_assets').insert({
    lesson_id:lessonId,owner_id:user.id,object_path:path,file_name:fileName,
    mime_type:mimeType,file_size:sizeBytes,status:'pending',
  }).select('id').single();
  if (assetError || !asset) return NextResponse.json({error:'تعذر تسجيل الملف قبل رفعه.'},{status:500});
  return NextResponse.json({
    assetId:asset.id,
    mimeType,
    bucket: 'aslan-academy',
    objectPath: path,
    maxBytes: currentStorageLimit,
    plannedMaxBytes: ACADEMY_MAX_FILE_BYTES,
    protocol: 'tus-resumable',
    note: 'يجب إتمام الرفع عبر جلسة TUS مباشرة إلى التخزين ثم تسجيل المورد والتحقق منه.',
  });
}
