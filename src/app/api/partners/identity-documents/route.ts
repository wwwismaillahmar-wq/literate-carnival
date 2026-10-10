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

function actualMime(bytes: Buffer): string | null {
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
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

  let uploadedPath: string | null = null;
  let db: Awaited<ReturnType<typeof createClient>> | null = null;
  try {
    db = await createClient();
    const { user } = await currentAccess(db);
    if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });

    const form = await request.formData();
    const fileValue = form.get('file');
    if (!(fileValue instanceof File)) return NextResponse.json({ error: 'اختر ملف الوثيقة أولًا.' }, { status: 400 });
    if (fileValue.size < 1 || fileValue.size > maxFileSize) return NextResponse.json({ error: 'حجم الوثيقة يجب ألا يتجاوز 10 MiB.' }, { status: 413 });

    const bytes = Buffer.from(await fileValue.arrayBuffer());
    const detectedMime = actualMime(bytes);
    const declaredMime = fileValue.type.trim().toLowerCase();
    if (!detectedMime || !allowedMime.has(declaredMime) || detectedMime !== declaredMime) {
      return NextResponse.json({ error: 'نوع الملف الفعلي لا يطابق PDF أو JPEG أو PNG أو WebP المسموح.' }, { status: 415 });
    }

    const legalName = String(form.get('legalName') ?? '').trim();
    const countryCode = String(form.get('countryCode') ?? '').trim().toUpperCase();
    const documentType = String(form.get('documentType') ?? '').trim();
    const issuingCountry = String(form.get('issuingCountry') ?? countryCode).trim();
    const expiresRaw = String(form.get('expiresAt') ?? '').trim();
    const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) ? expiresRaw : null;
    const consent = form.get('consent') === 'true';

    if (!consent || legalName.length < 2 || legalName.length > 220 ||
        !/^[A-Z]{2,3}$/.test(countryCode) || documentType.length < 2 || documentType.length > 100 ||
        issuingCountry.length > 100 || (expiresRaw && !expiresAt)) {
      return NextResponse.json({ error: 'تحقق من الاسم القانوني والبلد ونوع الوثيقة والموافقة.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await db.from('partner_identity_profiles')
      .select('id,review_status').eq('user_id', user.id).eq('subject_type', 'individual').maybeSingle();
    if (existingError) return NextResponse.json({ error: 'تعذر التحقق من ملف الهوية.' }, { status: 500 });
    if (existing && !['pending', 'needs_information', 'rejected'].includes(existing.review_status)) {
      return NextResponse.json({ error: 'ملف الهوية في حالة لا تسمح بتعديله؛ تواصل مع الإدارة عند الحاجة إلى تحديث رسمي.' }, { status: 409 });
    }

    const documentId = crypto.randomUUID();
    const extension = detectedMime === 'application/pdf' ? 'pdf' : detectedMime === 'image/jpeg' ? 'jpg' : detectedMime === 'image/png' ? 'png' : 'webp';
    uploadedPath = user.id + '/' + documentId + '/original.' + extension;
    const { error: uploadError } = await db.storage.from(bucket).upload(uploadedPath, bytes, {
      contentType: detectedMime,
      upsert: false,
    });
    if (uploadError) {
      uploadedPath = null;
      return NextResponse.json({ error: 'تعذر رفع الوثيقة إلى المخزن الخاص.' }, { status: 503 });
    }

    let profileId: string;
    if (existing) {
      const { data: profile, error } = await db.from('partner_identity_profiles').update({
        legal_name: legalName, country_code: countryCode, contact_email: (user.email ?? '').toLowerCase(),
        identity_document_type: documentType, consent_at: new Date().toISOString(),
        review_status: 'pending', reviewer_id: null, reviewed_at: null, review_note: '',
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id).select('id').single();
      if (error || !profile) throw new Error('تعذر تحديث ملف الهوية.');
      profileId = profile.id;
    } else {
      const { data: profile, error } = await db.from('partner_identity_profiles').insert({
        user_id: user.id, subject_type: 'individual', legal_name: legalName, country_code: countryCode,
        contact_email: (user.email ?? '').toLowerCase(), identity_document_type: documentType,
        consent_at: new Date().toISOString(), review_status: 'pending',
      }).select('id').single();
      if (error || !profile) throw new Error('تعذر إنشاء ملف الهوية.');
      profileId = profile.id;
    }

    const { data: document, error: insertError } = await db.from('partner_identity_documents').insert({
      id: documentId, identity_profile_id: profileId, owner_id: user.id, document_type: documentType,
      storage_bucket: bucket, object_path: uploadedPath, mime_type: detectedMime, file_size_bytes: bytes.byteLength,
      issuing_country: issuingCountry, expires_at: expiresAt, review_status: 'pending', upload_status: 'pending',
    }).select('id').single();
    if (insertError || !document) throw new Error('تعذر تسجيل الوثيقة في قاعدة البيانات.');

    const { data: completed, error: completionError } = await db.rpc('complete_partner_identity_document', { p_document_id: documentId });
    if (completionError || !completed) {
      return NextResponse.json({ error: 'حُفظ الملف والوثيقة، لكن تعذر تأكيد اكتمال الرفع. أعد المحاولة من قائمة الوثائق.' }, { status: 503 });
    }

    uploadedPath = null;
    return NextResponse.json({ document: { id: documentId, upload_status: 'uploaded', mime_type: detectedMime, file_size_bytes: bytes.byteLength } }, { status: 201 });
  } catch (cause) {
    if (uploadedPath && db) {
      await db.storage.from(bucket).remove([uploadedPath]);
    }
    const message = cause instanceof Error ? cause.message : 'تعذر حفظ وثيقة الهوية.';
    return NextResponse.json({ error: message }, { status: 500 });
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
