import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const languages = new Set(['ar', 'fr', 'en', 'es', 'de', 'it']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function adminAccess() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, allowed: false };
  const { data, error } = await db.rpc('has_role', { role_key: 'super_admin' });
  return { db, user, allowed: !error && data === true };
}

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

function language(value: unknown): value is string {
  return typeof value === 'string' && languages.has(value);
}

export async function GET() {
  const { db, user, allowed } = await adminAccess();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إدارة بنية الأكاديمية محصورة بالإدارة العليا.' }, { status: 403 });

  const [schools, branches, offerings, courses] = await Promise.all([
    db.from('academy_schools').select('id,slug,name,description,default_language,supported_languages,status,created_at,updated_at').order('name').limit(200),
    db.from('academy_branches').select('id,school_id,slug,name,address,timezone,language,status,created_at,updated_at').order('name').limit(500),
    db.from('academy_course_offerings').select('id,school_id,branch_id,course_id,language,status,capacity,starts_at,ends_at,created_at,updated_at').order('created_at', { ascending: false }).limit(500),
    db.from('courses').select('id,title,status').order('title').limit(500),
  ]);
  const failed = [schools.error, branches.error, offerings.error, courses.error].some(Boolean);
  if (failed) return NextResponse.json({ error: 'تعذر تحميل بيانات المدارس والفروع والعروض التعليمية.' }, { status: 500 });
  return NextResponse.json({
    schools: schools.data ?? [],
    branches: branches.data ?? [],
    offerings: offerings.data ?? [],
    courses: courses.data ?? [],
    languages: [...languages],
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  const { db, user, allowed } = await adminAccess();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'إنشاء المدارس والفروع والعروض التعليمية محصور بالإدارة العليا.' }, { status: 403 });

  try {
    const body = await request.json();
    if (body.action === 'create_school') {
      const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const defaultLanguage = body.defaultLanguage;
      const supportedLanguages = Array.isArray(body.supportedLanguages) ? [...new Set(body.supportedLanguages)] : [];
      if (!slugPattern.test(slug) || name.length < 2 || name.length > 180 || description.length > 5000 ||
          !language(defaultLanguage) || supportedLanguages.length < 1 || supportedLanguages.length > 6 ||
          !supportedLanguages.every(language) || !supportedLanguages.includes(defaultLanguage)) {
        return NextResponse.json({ error: 'بيانات المدرسة أو اللغات المدعومة غير صالحة.' }, { status: 400 });
      }
      const { data, error } = await db.from('academy_schools').insert({
        slug, name, description, default_language: defaultLanguage,
        supported_languages: supportedLanguages, status: 'draft', created_by: user.id,
      }).select('id,slug,name,default_language,supported_languages,status').single();
      if (error || !data) return NextResponse.json({ error: 'تعذر حفظ المدرسة. تحقق من عدم تكرار الرابط المختصر.' }, { status: 409 });
      return NextResponse.json({ school: data }, { status: 201 });
    }

    if (body.action === 'create_branch') {
      const schoolId = typeof body.schoolId === 'string' ? body.schoolId : '';
      const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const address = typeof body.address === 'string' ? body.address.trim() : '';
      const timezone = typeof body.timezone === 'string' ? body.timezone.trim() : 'Africa/Algiers';
      const branchLanguage = body.language;
      if (!uuid.test(schoolId) || !slugPattern.test(slug) || name.length < 2 || name.length > 180 ||
          address.length > 1000 || timezone.length < 1 || timezone.length > 80 || !language(branchLanguage)) {
        return NextResponse.json({ error: 'بيانات الفرع غير صالحة.' }, { status: 400 });
      }
      const { data: school, error: schoolError } = await db.from('academy_schools')
        .select('id,supported_languages').eq('id', schoolId).maybeSingle();
      if (schoolError || !school) return NextResponse.json({ error: 'المدرسة غير موجودة.' }, { status: 404 });
      if (!school.supported_languages.includes(branchLanguage)) {
        return NextResponse.json({ error: 'لغة الفرع ليست ضمن لغات المدرسة المدعومة.' }, { status: 400 });
      }
      const { data, error } = await db.from('academy_branches').insert({
        school_id: schoolId, slug, name, address, timezone, language: branchLanguage,
        status: 'draft',
      }).select('id,school_id,slug,name,language,status').single();
      if (error || !data) return NextResponse.json({ error: 'تعذر حفظ الفرع. تحقق من المدرسة والرابط المختصر.' }, { status: 409 });
      return NextResponse.json({ branch: data }, { status: 201 });
    }

    if (body.action === 'create_offering') {
      const schoolId = typeof body.schoolId === 'string' ? body.schoolId : '';
      const branchId = body.branchId === '' || body.branchId == null ? null : body.branchId;
      const courseId = typeof body.courseId === 'string' ? body.courseId : '';
      const offeringLanguage = body.language;
      const capacity = body.capacity === '' || body.capacity == null ? null : Number(body.capacity);
      const startsAt = typeof body.startsAt === 'string' && body.startsAt ? new Date(body.startsAt) : null;
      const endsAt = typeof body.endsAt === 'string' && body.endsAt ? new Date(body.endsAt) : null;
      if (!uuid.test(schoolId) || (branchId !== null && (typeof branchId !== 'string' || !uuid.test(branchId))) ||
          !uuid.test(courseId) || !language(offeringLanguage) ||
          (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 1000000)) ||
          (startsAt && !Number.isFinite(startsAt.getTime())) || (endsAt && !Number.isFinite(endsAt.getTime())) ||
          (startsAt && endsAt && endsAt <= startsAt)) {
        return NextResponse.json({ error: 'بيانات العرض التعليمي غير صالحة.' }, { status: 400 });
      }
      const { data: school, error: schoolError } = await db.from('academy_schools')
        .select('id,supported_languages').eq('id', schoolId).maybeSingle();
      if (schoolError || !school) return NextResponse.json({ error: 'المدرسة غير موجودة.' }, { status: 404 });
      if (!school.supported_languages.includes(offeringLanguage)) {
        return NextResponse.json({ error: 'لغة العرض ليست ضمن لغات المدرسة المدعومة.' }, { status: 400 });
      }
      if (branchId) {
        const { data: branch, error: branchError } = await db.from('academy_branches')
          .select('id,school_id,language').eq('id', branchId).eq('school_id', schoolId).maybeSingle();
        if (branchError || !branch) return NextResponse.json({ error: 'الفرع لا يتبع المدرسة المحددة.' }, { status: 400 });
        if (branch.language !== offeringLanguage) return NextResponse.json({ error: 'لغة العرض يجب أن تطابق لغة الفرع.' }, { status: 400 });
      }
      const { data: course, error: courseError } = await db.from('courses')
        .select('id').eq('id', courseId).maybeSingle();
      if (courseError || !course) return NextResponse.json({ error: 'الدورة الأصلية غير موجودة.' }, { status: 404 });
      const { data, error } = await db.from('academy_course_offerings').insert({
        school_id: schoolId, branch_id: branchId, course_id: courseId, language: offeringLanguage,
        capacity, starts_at: startsAt?.toISOString() ?? null, ends_at: endsAt?.toISOString() ?? null,
        status: 'draft', created_by: user.id,
      }).select('id,school_id,branch_id,course_id,language,status,capacity,starts_at,ends_at').single();
      if (error || !data) return NextResponse.json({ error: 'تعذر حفظ العرض التعليمي؛ تحقق من عدم تكراره.' }, { status: 409 });
      return NextResponse.json({ offering: data }, { status: 201 });
    }

    return NextResponse.json({ error: 'نوع العملية غير مدعوم.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 });
  const { db, user, allowed } = await adminAccess();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: 'تعديل حالة بنية الأكاديمية محصور بالإدارة العليا.' }, { status: 403 });

  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    const kind = body.kind;
    const status = body.status;
    const allowedStatuses: Record<string, string[]> = {
      school: ['draft', 'active', 'suspended', 'archived'],
      branch: ['draft', 'active', 'suspended', 'archived'],
      offering: ['draft', 'published', 'archived'],
    };
    if (!uuid.test(id) || typeof kind !== 'string' || !allowedStatuses[kind] || !allowedStatuses[kind].includes(status)) {
      return NextResponse.json({ error: 'تحديث الحالة غير صالح.' }, { status: 400 });
    }

    if (kind === 'offering' && status === 'published') {
      const { data: offering, error } = await db.from('academy_course_offerings')
        .select('id,school_id,branch_id,language').eq('id', id).maybeSingle();
      if (error || !offering) return NextResponse.json({ error: 'العرض التعليمي غير موجود.' }, { status: 404 });
      const { data: school } = await db.from('academy_schools').select('status,supported_languages')
        .eq('id', offering.school_id).maybeSingle();
      if (!school || school.status !== 'active' || !school.supported_languages.includes(offering.language)) {
        return NextResponse.json({ error: 'فعّل المدرسة وتأكد من دعم لغة العرض قبل النشر.' }, { status: 409 });
      }
      if (offering.branch_id) {
        const { data: branch } = await db.from('academy_branches').select('status,language')
          .eq('id', offering.branch_id).maybeSingle();
        if (!branch || branch.status !== 'active' || branch.language !== offering.language) {
          return NextResponse.json({ error: 'فعّل الفرع وتأكد من تطابق اللغة قبل نشر العرض.' }, { status: 409 });
        }
      }
    }

    const table: 'academy_schools' | 'academy_branches' | 'academy_course_offerings' = kind === 'school' ? 'academy_schools' : kind === 'branch' ? 'academy_branches' : 'academy_course_offerings';
    const { data, error } = await db.from(table).update({ status, updated_at: new Date().toISOString() })
      .eq('id', id).select('id,status').maybeSingle();
    if (error || !data) return NextResponse.json({ error: 'تعذر تحديث الحالة أو أن السجل غير قابل للتعديل.' }, { status: 409 });
    return NextResponse.json({ record: data });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
