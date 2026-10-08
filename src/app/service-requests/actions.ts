'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function createServiceRequest(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/service-requests');
  const serviceId = String(formData.get('service_id') || '');
  const description = String(formData.get('description') || '').trim();
  const preferredAtRaw = String(formData.get('preferred_at') || '').trim();
  if (!serviceId || !description) redirect('/service-requests?error=بيانات+الطلب+ناقصة');
  const requestNumber = 'SR-' + Date.now().toString(36).toUpperCase();
  const { error } = await db.from('service_requests').insert({
    request_number: requestNumber,
    customer_id: user.id,
    service_id: serviceId,
    description,
    preferred_at: preferredAtRaw ? new Date(preferredAtRaw).toISOString() : null,
    status: 'submitted',
  });
  if (error) redirect('/service-requests?error=' + encodeURIComponent(error.message));
  redirect('/service-requests?success=' + encodeURIComponent('تم إنشاء طلب الخدمة'));
}
