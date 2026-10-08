'use server';

import { redirect } from 'next/navigation';
import { addToCart } from '@/domains/commerce/cart';

export async function addProductToCart(formData: FormData) {
  const productId = Number(formData.get('product_id'));
  const quantity = Math.max(1, Number(formData.get('quantity') || 1));
  if (!productId || !Number.isFinite(quantity)) {
    redirect('/products');
  }
  try {
    await addToCart(productId, quantity);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'تعذر إضافة المنتج إلى السلة';
    if (message === 'AUTH_REQUIRED') redirect('/login?next=/cart');
    redirect('/products?error=' + encodeURIComponent(message));
  }
  redirect('/cart');
}
