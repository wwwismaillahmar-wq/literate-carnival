'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function localAlgeriaDateTime(value: string): string | null {
  if (!value) return null;
  const normalized = value.length === 16 ? value + ':00' : value;
  const date = new Date(normalized + '+01:00');
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export async function createServiceRequest(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/service-requests');

  const serviceId = String(formData.get('service_id') || '').trim();
  const description = String(formData.get('description') || '').trim();
  const preferredAtRaw = String(formData.get('preferred_at') || '').trim();
  const preferredAt = preferredAtRaw ? localAlgeriaDateTime(preferredAtRaw) : null;

  if (!serviceId || description.length < 5 || description.length > 4000) {
    redirect('/service-requests?error=' + encodeURIComponent('اختر الخدمة واكتب وصفًا من 5 إلى 4000 حرف.'));
  }
  if (preferredAtRaw && !preferredAt) {
    redirect('/service-requests?error=' + encodeURIComponent('التاريخ والوقت المفضلان غير صالحين.'));
  }

  const requestNumber = 'SR-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomUUID().slice(0, 5).toUpperCase();
  const { error } = await db.rpc('create_service_request', {
    p_request_number: requestNumber,
    p_service_id: serviceId,
    p_description: description,
    p_preferred_at: preferredAt,
  });
  if (error) redirect('/service-requests?error=' + encodeURIComponent(error.message));

  revalidatePath('/service-requests');
  redirect('/service-requests?success=' + encodeURIComponent('تم إنشاء طلب الخدمة ' + requestNumber));
}

export async function transitionMyServiceRequest(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/service-requests');
  const requestId = String(formData.get('request_id') || '').trim();
  const toStatus = String(formData.get('to_status') || '').trim();
  const note = String(formData.get('note') || '').trim();
  if (!requestId || !['accepted', 'rejected', 'cancelled'].includes(toStatus)) {
    redirect('/service-requests?error=' + encodeURIComponent('انتقال الحالة غير صالح.'));
  }
  const { error } = await db.rpc('transition_service_request', {
    p_request_id: requestId,
    p_to_status: toStatus,
    p_note: note,
  });
  if (error) redirect('/service-requests?error=' + encodeURIComponent(error.message));
  revalidatePath('/service-requests');
  redirect('/service-requests?success=' + encodeURIComponent('تم تحديث طلب الخدمة.'));
}
