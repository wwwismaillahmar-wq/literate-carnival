import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function published(row: Record<string, unknown>) {
  if (typeof row.published === 'boolean') return row.published;
  if (typeof row.is_published === 'boolean') return row.is_published;
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.visibility === 'string') return ['published', 'public'].includes(row.visibility.toLowerCase());
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.status === 'string') return ['published', 'active', 'public'].includes(row.status.toLowerCase());
  return false;
}

export async function GET() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return NextResponse.json({ error: 'يجب تسجيل الدخول.' }, { status: 401 });
  const { data, error } = await db.from('academy_enrollments')
    .select('id,course_id,offering_id,status,enrolled_at,completed_at')
    .eq('user_id', user.id).order('enrolled_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'تعذر تحميل تسجيلاتك.' }, { status: 500 });
  return NextResponse.json({ enrollments: data ?? [] });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) { try { if (new URL(origin).origin !== new URL(request.url).origin) return NextResponse.json({ error: 'مصدر الطلب غير مسموح.' }, { status: 403 }); } catch { return NextResponse.json({ error: 'مصدر الطلب غير صالح.' }, { status: 403 }); } }
  try {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (!user) return NextResponse.json({ error: 'سجّل الدخول قبل التسجيل في دورة.' }, { status: 401 });
    const body = await request.json();
    const courseId = typeof body.courseId === 'string' ? body.courseId.trim() : '';
    const offeringId = typeof body.offeringId === 'string' && body.offeringId.trim() ? body.offeringId.trim() : null;
    if (!courseId || courseId.length > 120 || (offeringId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(offeringId))) return NextResponse.json({ error: 'معرّف الدورة أو العرض غير صالح.' }, { status: 400 });
    const { data: course, error: courseError } = await db.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (courseError) return NextResponse.json({ error: 'تعذر التحقق من الدورة.' }, { status: 500 });
    if (!course || !published(course as Record<string, unknown>)) return NextResponse.json({ error: 'الدورة غير منشورة أو غير موجودة.' }, { status: 404 });
    if (offeringId) {
      const { data: offering, error: offeringError } = await db.from('academy_course_offerings')
        .select('id,course_id,status').eq('id', offeringId).maybeSingle();
      if (offeringError) return NextResponse.json({ error: 'تعذر التحقق من العرض التعليمي.' }, { status: 500 });
      if (!offering || offering.course_id !== courseId) return NextResponse.json({ error: 'العرض لا يتبع هذه الدورة.' }, { status: 400 });
    } else {
      const { data: availableOfferings, error: offeringsError } = await db.from('academy_course_offerings')
        .select('id').eq('course_id', courseId).eq('status', 'published').limit(1);
      if (offeringsError) return NextResponse.json({ error: 'تعذر التحقق من عروض الدورة.' }, { status: 500 });
      if (availableOfferings?.length) return NextResponse.json({ error: 'اختر المدرسة أو الفرع الذي تم قبولك فيه.' }, { status: 400 });
    }
    let admissionQuery = db.from('academy_admission_applications')
      .select('id,status,offering_id').eq('user_id', user.id).eq('course_id', courseId)
      .in('status', ['accepted','payment_pending','paid','enrolled']);
    admissionQuery = offeringId ? admissionQuery.eq('offering_id', offeringId) : admissionQuery.is('offering_id', null);
    const { data: admission, error: admissionError } = await admissionQuery
      .order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    if (admissionError) return NextResponse.json({ error: 'تعذر التحقق من قرار القبول.' }, { status: 500 });
    if (!admission) return NextResponse.json({ error: 'يجب إرسال طلب القبول واجتياز المراجعة قبل التسجيل النهائي.' }, { status: 403 });
    if (admission.status !== 'paid' && admission.status !== 'enrolled') {
      return NextResponse.json({ error: admission.status === 'accepted' || admission.status === 'payment_pending'
        ? 'تم قبول الطلب مبدئيًا، لكن التسجيل ينتظر تأكيد الدفع من جهة الدفع الموثوقة.'
        : 'طلب القبول غير جاهز للتسجيل النهائي.' }, { status: 409 });
    }
    const { data, error } = await db.rpc('enroll_academy_learner', {
      p_course_id: courseId,
      p_offering_id: offeringId,
    });
    if (error) {
      if (error.message.includes('PAID_ADMISSION_REQUIRED')) {
        return NextResponse.json({ error: 'التسجيل النهائي يتطلب قبولًا مؤكدًا ودفعًا موثقًا.' }, { status: 409 });
      }
      if (error.message.includes('OFFERING_REQUIRED')) {
        return NextResponse.json({ error: 'اختر المدرسة أو الفرع قبل التسجيل.' }, { status: 400 });
      }
      if (error.message.includes('OFFERING_NOT_AVAILABLE') || error.message.includes('OFFERING_COURSE_MISMATCH')) {
        return NextResponse.json({ error: 'عرض الدورة غير متاح أو لا يتبع هذه الدورة.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'تعذر تأكيد التسجيل في قاعدة البيانات.' }, { status: 500 });
    }
    const saved = Array.isArray(data) ? data[0] : data;
    if (!saved?.enrollment_id) return NextResponse.json({ error: 'تعذر تأكيد التسجيل المحفوظ.' }, { status: 500 });
    const enrollment = {
      id: saved.enrollment_id, course_id: saved.course_id, offering_id: saved.offering_id,
      status: saved.status, enrolled_at: saved.enrolled_at, completed_at: saved.completed_at,
    };
    return NextResponse.json({ enrollment, alreadyEnrolled: saved.already_enrolled === true }, {
      status: saved.already_enrolled === true ? 200 : 201,
    });
  } catch {
    return NextResponse.json({ error: 'صيغة الطلب غير صالحة.' }, { status: 400 });
  }
}
