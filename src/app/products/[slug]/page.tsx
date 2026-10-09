import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { whatsappLink } from '@/lib/config';
import { addProductToCart } from '../actions';

export const dynamic = 'force-dynamic';

export default async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await createClient();

  const { data: product, error } = await db
    .from('products')
    .select('id,name,slug,description,price_dzd,stock,active,images,created_at,category:categories(name)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle();

  if (error || !product) notFound();

  const { data: reviews, error: reviewsError } = await db
    .from('reviews')
    .select('id,rating,body,created_at')
    .eq('subject_type', 'product')
    .eq('subject_id', String(product.id))
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(20);
  if (reviewsError) throw new Error('تعذر تحميل تقييمات المنتج.');

  const { data: media } = await db
    .from('media_assets')
    .select('id,media_type,mime_type,object_path,bucket_id')
    .eq('product_id', product.id)
    .order('created_at', { ascending: true });

  const gallery = [];
  for (const item of media ?? []) {
    const signed = await db.storage.from(item.bucket_id ?? 'aslan-media').createSignedUrl(item.object_path, 3600);
    if (signed.data?.signedUrl) gallery.push({ ...item, url: signed.data.signedUrl });
  }

  const legacyImages = Array.isArray(product.images)
    ? product.images.filter((item: unknown): item is string => typeof item === 'string')
    : [];
  const images = [...gallery.filter((item) => item.media_type === 'image').map((item) => item.url), ...legacyImages];
  const categoryData = product.category as { name: string } | { name: string }[] | null;
  const category = Array.isArray(categoryData) ? categoryData[0]?.name : categoryData?.name;

  return (
    <main className="section">
      <div className="wrap">
        <div style={{ marginBottom: 18 }}>
          <Link href="/products">← العودة إلى الـMarket</Link>
        </div>

        <div className="grid two" style={{ alignItems: 'start' }}>
          <div className="card">
            <div style={{ display: 'grid', gap: 12 }}>
              {images.length ? images.map((url, index) => (
                <img
                  key={url + index}
                  src={url}
                  alt={product.name}
                  style={{ width: '100%', maxHeight: 520, objectFit: 'cover', borderRadius: 10 }}
                />
              )) : (
                <div style={{ minHeight: 360, display: 'grid', placeItems: 'center' }} className="muted">ASLAN</div>
              )}
              {gallery.filter((item) => item.media_type === 'video').map((item) => (
                <video key={item.id} src={item.url} controls style={{ width: '100%', borderRadius: 10 }} />
              ))}
            </div>
          </div>

          <article className="card">
            <span className="kicker">{category ?? 'ASLAN MARKET'}</span>
            <h1>{product.name}</h1>
            {product.description && <p className="lead">{product.description}</p>}
            <div className="product-price" style={{ fontSize: 24, margin: '20px 0' }}>
              {product.price_dzd === null ? 'حسب الطلب' : `${product.price_dzd} دج`}
            </div>
            <p className="muted">
              {product.stock > 0 ? `متوفر — ${product.stock} قطعة` : 'المنتج غير متوفر حاليًا'}
            </p>

            <div className="card" style={{ marginTop: 24 }}>
              <form action={addProductToCart} style={{ display:'grid', gap:12 }}>
                <input type="hidden" name="product_id" value={product.id} />
                <label>الكمية
                  <input name="quantity" type="number" min="1" max={Math.max(1, product.stock)} defaultValue="1" disabled={product.stock <= 0} />
                </label>
                <button className="button primary" type="submit" disabled={product.stock <= 0}>أضف إلى السلة</button>
              </form>
            </div>
            <div className="actions" style={{ marginTop: 16 }}>
              <a className="button secondary" href={whatsappLink(`مرحباً ASLAN MODELLING، أريد طلب المنتج: ${product.name}. أرجو إرسال التفاصيل.`)} target="_blank" rel="noopener noreferrer">طلب عبر WhatsApp</a>
              <Link className="button secondary" href="/cart">السلة</Link>
              <Link className="button secondary" href="/products">كل المنتجات</Link>
            </div>
            <div className="card" style={{ marginTop: 20 }}>
              <strong>مسار الشراء</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                إضافة إلى السلة → Checkout → حجز المخزون وإنشاء الفاتورة → الدفع الإلكتروني عند تفعيل مزود M15.
              </p>
            </div>
          </article>
        </div>
        <section className="card" style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <h2>تقييمات العملاء</h2>
            <Link href="/reviews">تقييم مشترياتك أو خدماتك ←</Link>
          </div>
          {!reviews?.length ? <p className="muted">لا توجد تقييمات معتمدة لهذا المنتج بعد.</p> : <div style={{ display: 'grid', gap: 12 }}>
            {reviews.map(review => <article key={review.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
              <strong aria-label={'التقييم ' + review.rating + ' من 5'}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</strong>
              <p>{review.body || 'تقييم دون تعليق.'}</p>
              <small className="muted">{new Date(review.created_at).toLocaleDateString('ar-DZ')}</small>
            </article>)}
          </div>}
        </section>
      </div>
    </main>
  );
}
