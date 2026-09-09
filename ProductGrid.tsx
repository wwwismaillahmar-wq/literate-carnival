'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { whatsappLink } from '@/lib/config';

export function ProductGrid({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))) as string[],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar');

    return products.filter((product) => {
      const searchable = `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('ar');
      return (
        (!category || product.category === category) &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [products, query, category]);

  return (
    <>
      <div className="filters" role="search" aria-label="البحث في المنتجات">
        <label>
          <span className="sr-only">البحث عن منتج</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث عن منتج..."
            type="search"
            autoComplete="off"
          />
        </label>

        <label>
          <span className="sr-only">تصنيف المنتج</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">كل التصنيفات</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid three">
        {filteredProducts.map((product) => (
          <article className="card product-card" key={product.id}>
            <div className="product-image">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} loading="lazy" />
              ) : (
                <span aria-hidden="true">ASLAN</span>
              )}
            </div>
            <h3>{product.name}</h3>
            {product.description && <p className="muted">{product.description}</p>}
            <div className="product-price">
              {product.price === null ? 'حسب الطلب' : `${product.price} دج`}
            </div>
            <a
              className="btn primary"
              style={{ marginTop: 14 }}
              href={whatsappLink(
                `مرحباً ASLAN MODELLING، أريد طلب المنتج: ${product.name}. أرجو إرسال التفاصيل.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              اطلب القطعة
            </a>
          </article>
        ))}

        {!filteredProducts.length && (
          <div className="card">
            <h3>لا توجد منتجات مطابقة.</h3>
            <p className="muted">جرّب تغيير كلمة البحث أو التصنيف.</p>
          </div>
        )}
      </div>
    </>
  );
}
