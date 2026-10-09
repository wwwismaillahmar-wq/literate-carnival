import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  const url = new URL(request.url);
  const categoryId = Number(url.searchParams.get('categoryId') ?? 0);
  const limit = Math.max(1, Math.min(12, Number(url.searchParams.get('limit') ?? 6) || 6));
  if (categoryId && (!Number.isInteger(categoryId) || categoryId < 1)) return NextResponse.json({ error: 'معرّف الفئة غير صالح.' }, { status: 400 });
  let query = db.from('products').select('id,name,slug,description,price_dzd,images,category_id,created_at').eq('active', true).order('created_at', { ascending: false }).limit(100);
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: 'تعذر تحميل توصيات المنتجات.' }, { status: 500 });
  const ranked = (data ?? []).map((product, index) => ({
    ...product,
    score: categoryId && product.category_id === categoryId ? 100 - index : 50 - index,
    reason: categoryId && product.category_id === categoryId ? 'مطابقة للفئة التي اخترتها' : 'منتج نشط حديث الإضافة',
    algorithm: 'rules-v1',
  })).sort((a, b) => b.score - a.score).slice(0, limit);
  if (user) {
    await db.from('recommendation_events').insert({
      user_id: user.id, context: categoryId ? 'category:' + categoryId : 'catalog',
      product_ids: ranked.map((item) => item.id), algorithm_version: 'rules-v1',
    });
  }
  return NextResponse.json({ recommendations: ranked, algorithm: 'rules-v1', personalized: false, explanation: 'توصيات قواعدية قابلة للتفسير؛ لا تستخدم بيانات حساسة ولا تدعي تخصيصًا غير منفذ.' });
}
