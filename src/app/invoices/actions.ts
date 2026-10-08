'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function startPayment(formData: FormData) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login?next=/invoices');
  const invoiceId = String(formData.get('invoice_id') || '');
  const provider = String(formData.get('provider') || '');
  if (!invoiceId || !provider) redirect('/invoices?error=اختر+الفاتورة+وطريقة+الدفع');
  const { data: invoice, error: invoiceError } = await db.from('invoices').select('id,total_amount,currency,status,customer_id').eq('id',invoiceId).eq('customer_id',user.id).single();
  if (invoiceError || !invoice || invoice.status === 'paid') redirect('/invoices?error=الفاتورة+غير+قابلة+للدفع');
  const { data: config, error: configError } = await db.from('payment_provider_configs').select('provider_key,enabled').eq('provider_key',provider).eq('enabled',true).maybeSingle();
  if (configError || !config) redirect('/invoices?error=طريقة+الدفع+غير+مفعلة');
  const idempotencyKey = `invoice:${invoice.id}:${user.id}:${provider}`;
  const { error } = await db.from('payments').upsert({ invoice_id: invoice.id, payer_id: user.id, provider: config.provider_key, amount: invoice.total_amount, currency: invoice.currency, status: 'pending', idempotency_key: idempotencyKey }, { onConflict: 'idempotency_key' });
  if (error) redirect('/invoices?error=' + encodeURIComponent(error.message));
  redirect('/invoices?payment=' + encodeURIComponent(invoice.id));
}
