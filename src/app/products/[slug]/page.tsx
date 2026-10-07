import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { whatsappLink } from '@/lib/config';

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

            <div className="actions" style={{ marginTop: 24 }}>
              <a
                className="button primary"
                href={whatsappLink(`مرحباً ASLAN MODELLING، أريد طلب المنتج: ${product.name}. أرجو إرسال التفاصيل.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                اطلب المنتج
              </a>
              <Link className="button secondary" href="/products">كل المنتجات</Link>
            </div>

            <div className="card" style={{ marginTop: 20 }}>
              <strong>الدفع</strong>
              <p className="muted" style={{ marginBottom: 0 }}>
                صفحة الطلب والدفع الإلكتروني الموحدة قيد البناء؛ هذا الزر لا يدّعي وجود بوابة دفع جاهزة.
              </p>
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
