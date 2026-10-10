import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const bucket = 'aslan-private-documents';
const maxFileSize = 10 * 1024 * 1024;
const allowedMime = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const allowedReviews = new Set(['verified', 'rejected', 'needs_information', 'expired']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function currentAccess(db: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { user: null, admin: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { user, admin: !error && data === true };
}

export async function GET() {
  const db = await createClient();
  const { user, admin } = await currentAccess(db);
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });

  let query = db.from('partner_identity_documents')
    .select('id,identity_profile_id,owner_id,document_type,mime_type,file_size_bytes,issuing_country,expires_at,review_status,reviewer_id,reviewed_at,review_note,upload_status,uploaded_at,created_at,object_path')
    .order('created_at', { ascending: false }).limit(100);
  if (!admin) query = query.eq('owner_id', user.id);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل وثائق التحقق.' }, { status: 500 });

  const profileIds = [...new Set((data ?? []).map((document) => document.identity_profile_id))];
  const { data: profiles, error: profileError } = profileIds.length
    ? await db.from('partner_identity_profiles').select('id,legal_name,country_code,review_status').in('id', profileIds)
    : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: 'تعذر تحميل حالة ملفات الهوية.' }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const documents = await Promise.all((data ?? []).map(async (document) => {
    const identityProfile = profileById.get(document.identity_profile_id) ?? null;
    if (document.upload_status !== 'uploaded') return { ...document, identity_profile: identityProfile, signed_url: null, object_path: undefined };
    const signed = await db.storage.from(bucket).createSignedUrl(document.object_path, 60);
    return { ...document, identity_profile: identityProfile, signed_url: signed.data?.signedUrl ?? null, object_path: undefined };
  }));
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 });
    }
  }

  try {
    const db = await createClient();
    const { user } = await currentAccess(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const body = await request.json();
    const legalName = typeof body.legalName === 'string' ? body.legalName.trim() : '';
    const countryCode = typeof body.countryCode === 'string' ? body.countryCode.trim().toUpperCase() : '';
    const documentType = typeof body.documentType === 'string' ? body.documentType.trim() : '';
    const mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : '';
    const fileSize = typeof body.fileSize === 'number' ? body.fileSize : 0;
    const issuingCountry = typeof body.issuingCountry === 'string' ? body.issuingCountry.trim() : countryCode;
    const expiresAt = typeof body.expiresAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.expiresAt) ? body.expiresAt : null;

    if (body.consent !== true || legalName.length < 2 || legalName.length > 220 ||
        !/^[A-Z]{2,3}$/.test(countryCode) || documentType.length < 2 || documentType.length > 100 ||
        !allowedMime.has(mimeType) || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > maxFileSize ||
        issuingCountry.length > 100 || (body.expiresAt && !expiresAt)) {
      return NextResponse.json({ error: 'تحقق من الاسم القانوني والبلد ونوع الوثيقة والملف والموافقة.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await db.from('partner_identity_profiles')
      .select('id,review_status').eq('user_id', user.id).eq('subject_type', 'individual').maybeSingle();
    if (existingError) return NextResponse.json({ error: 'تعذر التحقق من ملف الهوية.' }, { status: 500 });
    if (existing && !['pending', 'needs_information', 'rejected'].includes(existing.review_status)) {
      return NextResponse.json({ error: 'ملف الهوية في حالة لا تسمح بتعديله؛ تواصل مع الإدارة عند الحاجة إلى تحديث رسمي.' }, { status: 409 });
    }

    let profileId: string;
    if (existing) {
      const { data: profile, error } = await db.from('partner_identity_profiles').update({
        legal_name: legalName, country_code: countryCode, contact_email: (user.email ?? '').toLowerCase(),
        identity_document_type: documentType, consent_at: new Date().toISOString(),
        review_status: 'pending', reviewer_id: null, reviewed_at: null, review_note: '',
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id).select('id').single();
      if (error || !profile) return NextResponse.json({ error: 'تعذر تحديث ملف الهوية.' }, { status: 500 });
      profileId = profile.id;
    } else {
      const { data: profile, error } = await db.from('partner_identity_profiles').insert({
        user_id: user.id, subject_type: 'individual', legal_name: legalName, country_code: countryCode,
        contact_email: (user.email ?? '').toLowerCase(), identity_document_type: documentType,
        consent_at: new Date().toISOString(), review_status: 'pending',
      }).select('id').single();
      if (error || !profile) return NextResponse.json({ error: 'تعذر إنشاء ملف الهوية.' }, { status: 500 });
      profileId = profile.id;
    }

    const documentId = crypto.randomUUID();
    const objectPath = user.id + '/' + documentId + '/original';
    const { data: signedUpload, error: uploadError } = await db.storage.from(bucket).createSignedUploadUrl(objectPath);
    if (uploadError || !signedUpload) return NextResponse.json({ error: 'تعذر إنشاء رابط رفع خاص. تحقق من إعداد التخزين.' }, { status: 503 });

    const { data: document, error: insertError } = await db.from('partner_identity_documents').insert({
      id: documentId, identity_profile_id: profileId, owner_id: user.id, document_type: documentType,
      storage_bucket: bucket, object_path: objectPath, mime_type: mimeType, file_size_bytes: fileSize,
      issuing_country: issuingCountry, expires_at: expiresAt, review_status: 'pending', upload_status: 'pending',
    }).select('id,identity_profile_id,document_type,mime_type,file_size_bytes,issuing_country,expires_at,review_status,upload_status,created_at').single();

    if (insertError || !document) return NextResponse.json({ error: 'تعذر تسجيل الوثيقة في قاعدة البيانات.' }, { status: 500 });
    return NextResponse.json({ document, upload: { path: signedUpload.path, token: signedUpload.token } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const db = await createClient();
    const { user, admin } = await currentAccess(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
    const body = await request.json();

    if (body.reviewType === 'profile') {
      if (!admin) return NextResponse.json({ error: 'مراجعة ملفات الهوية للإدارة فقط.' }, { status: 403 });
      const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
      const status = typeof body.reviewStatus === 'string' ? body.reviewStatus : '';
      const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : '';
      if (!uuid.test(profileId) || !allowedReviews.has(status) || reviewNote.length > 2000) {
        return NextResponse.json({ error: 'قرار مراجعة ملف الهوية غير صالح.' }, { status: 400 });
      }
      const { data, error } = await db.rpc('admin_review_partner_identity_profile', {
        p_profile_id: profileId, p_status: status, p_review_note: reviewNote,
      });
      if (error) {
        const message = error.message.includes('IDENTITY_EVIDENCE_NOT_VERIFIED')
          ? 'لا يمكن اعتماد ملف الهوية قبل اعتماد وثيقة مرفوعة ومتحقق منها.'
          : error.message.includes('IDENTITY_PROFILE_NOT_FOUND') ? 'ملف الهوية غير موجود.' : 'تعذر حفظ قرار ملف الهوية.';
        return NextResponse.json({ error: message }, { status: error.message.includes('IDENTITY_EVIDENCE_NOT_VERIFIED') ? 409 : 500 });
      }
      return NextResponse.json({ profile: Array.isArray(data) ? data[0] : data });
    }

    const documentId = typeof body.documentId === 'string' ? body.documentId.trim() : '';
    if (!uuid.test(documentId)) return NextResponse.json({ error: 'معرّف الوثيقة غير صالح.' }, { status: 400 });

    if (body.reviewStatus !== undefined) {
      if (!admin) return NextResponse.json({ error: 'مراجعة الوثائق للإدارة فقط.' }, { status: 403 });
      const status = typeof body.reviewStatus === 'string' ? body.reviewStatus : '';
      const reviewNote = typeof body.reviewNote === 'string' ? body.reviewNote.trim() : '';
      if (!allowedReviews.has(status) || reviewNote.length > 2000) return NextResponse.json({ error: 'قرار المراجعة غير صالح.' }, { status: 400 });
      const { data, error } = await db.rpc('admin_review_partner_identity_document', {
        p_document_id: documentId, p_status: status, p_review_note: reviewNote,
      });
      if (error) {
        const message = error.message.includes('DOCUMENT_NOT_UPLOADED') ? 'لا يمكن مراجعة وثيقة لم يكتمل رفعها.' :
          error.message.includes('DOCUMENT_NOT_FOUND') ? 'الوثيقة غير موجودة.' : 'تعذر حفظ قرار المراجعة.';
        return NextResponse.json({ error: message }, { status: error.message.includes('DOCUMENT_NOT_UPLOADED') ? 409 : 500 });
      }
      return NextResponse.json({ review: Array.isArray(data) ? data[0] : data });
    }

    const { data, error } = await db.rpc('complete_partner_identity_document', { p_document_id: documentId });
    if (error) {
      const message = error.message.includes('DOCUMENT_OBJECT_MISSING') ? 'لم يعثر التخزين على الملف بعد؛ أكمل الرفع ثم أعد المحاولة.' :
        error.message.includes('DOCUMENT_NOT_FOUND') ? 'الوثيقة غير موجودة أو لا تملك صلاحية إكمالها.' : 'تعذر تثبيت اكتمال رفع الوثيقة.';
      return NextResponse.json({ error: message }, { status: error.message.includes('DOCUMENT_OBJECT_MISSING') ? 409 : 500 });
    }
    return NextResponse.json({ upload: Array.isArray(data) ? data[0] : data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
