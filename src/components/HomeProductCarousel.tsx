'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export type HomeProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  stock: number;
  image_url: string | null;
  media_urls: string[];
  category: string | null;
  badges: string[];
};

export function HomeProductCarousel({ products }: { products: HomeProduct[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const pages = useMemo(() => {
    const result: HomeProduct[][] = [];
    for (let i = 0; i < products.length; i += 4) result.push(products.slice(i, i + 4));
    return result;
  }, [products]);

  useEffect(() => {
    if (paused || pages.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % pages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, pages.length]);

  if (!products.length) return null;

  const current = pages[index] ?? pages[0];

  return (
    <section
      aria-label="منتجات ASLAN المميزة"
      className="card"
      style={{ overflow: 'hidden', position: 'relative' }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="section-heading row" style={{ marginBottom: 18 }}>
        <div>
          <span className="kicker">ASLAN MARKET DISCOVERY</span>
          <h2 style={{ marginBottom: 6 }}>منتجات تستحق المشاهدة</h2>
          <p className="muted" style={{ margin: 0 }}>
            الأكثر طلبًا، الأحدث، والمنتجات المدعومة إعلانيًا تظهر هنا تلقائيًا.
          </p>
        </div>
        <Link href="/products">دخول إلى الـMarket ↗</Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 14,
        }}
      >
        {current.map((product) => {
          const image = product.media_urls[0] ?? product.image_url;
          return (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="card product-card"
              style={{ textDecoration: 'none', padding: 0, overflow: 'hidden' }}
              aria-label={`فتح ${product.name} في المتجر`}
            >
              <div
                style={{
                  height: 190,
                  background: 'rgba(255,255,255,.04)',
                  display: 'grid',
                  placeItems: 'center',
                  overflow: 'hidden',
                }}
              >
                {image ? (
                  <img
                    src={image}
                    alt={product.name}
                    loading="eager"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="muted">ASLAN</span>
                )}
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {product.badges.slice(0, 2).map((badge) => (
                    <span key={badge} className="kicker">{badge}</span>
                  ))}
                </div>
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                {product.price !== null && (
                  <strong style={{ display: 'block', marginTop: 8 }}>{product.price} دج</strong>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {pages.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 16 }}>
          {pages.map((_, page) => (
            <button
              key={page}
              type="button"
              aria-label={`عرض المجموعة ${page + 1}`}
              aria-current={page === index}
              onClick={() => setIndex(page)}
              style={{
                width: page === index ? 26 : 8,
                height: 8,
                border: 0,
                borderRadius: 999,
                padding: 0,
                cursor: 'pointer',
                background: 'currentColor',
                opacity: page === index ? 1 : 0.3,
              }}
            />
          ))}
        </div>
      )}

      <p className="muted" style={{ textAlign: 'center', fontSize: 12, margin: '10px 0 0' }}>
        {paused ? 'متوقف مؤقتًا' : 'يتغير العرض تلقائيًا كل 5 ثوانٍ'} · اضغط على المنتج للدخول إلى الـMarket
      </p>
    </section>
  );
}
