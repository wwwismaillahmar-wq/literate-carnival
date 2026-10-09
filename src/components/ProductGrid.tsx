'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'stock';

export function ProductGrid({ products }: { products: Product[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [availability, setAvailability] = useState('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const categories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category).filter(Boolean))) as string[],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ar');
    const result = products.filter((product) => {
      const searchable = `${product.name} ${product.description ?? ''} ${product.category ?? ''}`.toLocaleLowerCase('ar');
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory = !category || product.category === category;
      const matchesAvailability = availability === 'all' ||
        (availability === 'available' && product.stock > 0) ||
        (availability === 'request' && product.stock <= 0);
      return matchesQuery && matchesCategory && matchesAvailability;
    });

    return result.sort((a, b) => {
      if (sort === 'price-asc') return (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER);
      if (sort === 'price-desc') return (b.price ?? -1) - (a.price ?? -1);
      if (sort === 'stock') return b.stock - a.stock;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [products, query, category, availability, sort]);

  return (
    <>
      <div className="market-toolbar">
        <label>
          <span>البحث في السوق</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم المنتج أو وصفه أو فئته…" type="search" autoComplete="off" />
        </label>
        <label>
          <span>الفئة</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="">جميع الفئات</option>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>التوفر</span>
          <select value={availability} onChange={(event) => setAvailability(event.target.value)}>
            <option value="all">جميع المنتجات</option>
            <option value="available">متوفر الآن</option>
            <option value="request">حسب الطلب / غير متوفر</option>
          </select>
        </label>
        <label>
          <span>الترتيب</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortOption)}>
            <option value="newest">الأحدث</option>
            <option value="price-asc">السعر: من الأقل</option>
            <option value="price-desc">السعر: من الأعلى</option>
            <option value="stock">الأكثر توفرًا</option>
          </select>
        </label>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',flexWrap:'wrap',margin:'0 0 18px'}}>
        <p className="muted" aria-live="polite">عرض {filteredProducts.length} من {products.length} منتج</p>
        {(query || category || availability !== 'all') && <button type="button" onClick={() => { setQuery(''); setCategory(''); setAvailability('all'); setSort('newest'); }}>مسح الفلاتر</button>}
      </div>

      <div className="grid three">
        {filteredProducts.map((product) => (
          <article className="card product-card" key={product.id}>
            <div className="product-image">
              {product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <span aria-hidden="true">ASLAN</span>}
            </div>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:12}}>
              <span className="market-category">{product.category ?? 'منتجات ASLAN'}</span>
              <span className={product.stock > 0 ? 'market-stock market-stock--available' : 'market-stock'}>{product.stock > 0 ? 'متوفر' : 'حسب الطلب'}</span>
            </div>
            <h3>{product.name}</h3>
            {product.description && <p className="muted market-description">{product.description}</p>}
            <div className="product-price">{product.price === null ? 'السعر حسب الطلب' : `${product.price.toLocaleString('ar-DZ')} دج`}</div>
            <p className="muted" style={{fontSize:13}}>{product.stock > 0 ? `المتاح حاليًا: ${product.stock}` : 'تواصل معنا لتأكيد التوفر ومدة التجهيز'}</p>
            <a className="btn primary" style={{marginTop:14,width:'100%'}} href={`/products/${product.slug}`}>التفاصيل والشراء / الطلب</a>
          </article>
        ))}

        {!filteredProducts.length && <div className="card"><h3>لا توجد منتجات مطابقة.</h3><p className="muted">غيّر كلمة البحث أو الفلاتر لعرض نتائج أخرى.</p><button type="button" onClick={() => { setQuery(''); setCategory(''); setAvailability('all'); setSort('newest'); }}>عرض جميع المنتجات</button></div>}
      </div>
    </>
  );
}
