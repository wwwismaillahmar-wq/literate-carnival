'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function textValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function submitCheckout(formData: FormData): Promise<never> {
  const recipientName = textValue(formData, 'recipient_name');
  const phone = textValue(formData, 'phone');
  const wilaya = textValue(formData, 'wilaya');
  const commune = textValue(formData, 'commune');
  const address = textValue(formData, 'address');
  const notes = textValue(formData, 'notes');

  if (!recipientName || !phone || !wilaya || !address) {
    redirect('/checkout?error=' + encodeURIComponent('أكمل اسم المستلم والهاتف والولاية والعنوان.'));
  }

  const db = await createClient();
  const { data: userResult } = await db.auth.getUser();

  if (!userResult.user) {
    redirect('/login?next=/checkout');
  }

  const orderNumber =
    'ORD-' +
    new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) +
    '-' +
    crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

  const { error } = await db.rpc('checkout_active_cart', {
    p_order_number: orderNumber,
    p_shipping_address: {
      recipient_name: recipientName,
      phone,
      wilaya,
      commune,
      address,
      notes,
    },
  });

  if (error) {
    const messageMap: Record<string, string> = {
      CART_NOT_FOUND: 'لا توجد سلة نشطة.',
      CART_EMPTY: 'السلة فارغة.',
      SHIPPING_ADDRESS_REQUIRED: 'بيانات التوصيل غير مكتملة.',
      INVENTORY_NOT_CONFIGURED: 'أحد المنتجات لم يتم ضبط مخزونه بعد.',
      INSUFFICIENT_STOCK: 'الكمية المطلوبة غير متوفرة في المخزون.',
      PRODUCT_INACTIVE: 'أحد المنتجات لم يعد متاحًا.',
      AUTH_REQUIRED: 'يجب تسجيل الدخول أولًا.',
    };

    const code = error.message.split(':')[0];
    redirect(
      '/checkout?error=' +
        encodeURIComponent(messageMap[code] ?? 'تعذر إنشاء الطلب. حاول مرة أخرى.')
    );
  }

  redirect('/orders');
}
