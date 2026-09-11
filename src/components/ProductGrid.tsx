import { useState, useMemo } from 'react';
import { Search, Filter, MessageCircle, Eye, Check, Tag } from 'lucide-react';
import type { Product } from '../types';
import { whatsappLink } from '../lib/config';

interface ProductGridProps {
  products: Product[];
  onSelectProduct?: (product: Product) => void;
}

export function ProductGrid({ products, onSelectProduct }: ProductGridProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  // Available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtering
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ar');
    return products.filter((product) => {
      const matchCategory =
        selectedCategory === 'all' || product.category === selectedCategory;
      const matchQuery =
        !q ||
        product.name.toLocaleLowerCase('ar').includes(q) ||
        (product.description && product.description.toLocaleLowerCase('ar').includes(q));
      return matchCategory && matchQuery;
    });
  }, [products, query, selectedCategory]);

  return (
    <section id="products" className="py-20 border-b border-[#c5a059]/20 bg-[#14181b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-1">
              <Tag className="w-3.5 h-3.5" />
              <span>MARKET</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f2ea]">
              المنتجات المعروضة والتفصيل
            </h2>
          </div>
          <div className="text-xs text-[#a8abad]">
            إجمالي المنتجات المسجلة: <span className="text-[#c5a059] font-bold">{products.length} منتجات</span> (بالدينار الجزائري دج)
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
          {/* Search Box */}
          <div className="md:col-span-7 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a8abad]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن صالون، كرسي، ظهر سرير، ستائر..."
              className="w-full bg-[#171b1e] border border-white/10 rounded-xl py-3 pr-11 pl-4 text-sm text-[#f5f2ea] placeholder-[#a8abad]/70 focus:outline-none focus:border-[#c5a059] transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="md:col-span-5 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-[#c5a059] text-[#111417]'
                  : 'bg-[#171b1e] border border-white/10 text-[#a8abad] hover:text-[#f5f2ea]'
              }`}
            >
              الكل ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#c5a059] text-[#111417]'
                      : 'bg-[#171b1e] border border-white/10 text-[#a8abad] hover:text-[#f5f2ea]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center bg-[#171b1e] rounded-2xl border border-white/10">
            <p className="text-base text-[#f5f2ea] font-bold mb-2">لا توجد منتجات مطابقة لبحثك</p>
            <p className="text-xs text-[#a8abad]">جرّب البحث باسم آخر أو اختيار تصنيف مختلف.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="group flex flex-col bg-[#171b1e] rounded-2xl border border-[#c5a059]/20 hover:border-[#c5a059]/60 transition-all duration-300 overflow-hidden shadow-lg shadow-black/40 hover:-translate-y-1"
              >
                {/* Product Image Area */}
                <div className="relative h-56 w-full bg-[#1b2024] overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#c5a059]/50">
                      <span className="font-latin-display text-2xl font-bold">ASLAN</span>
                      <span className="text-xs text-[#a8abad]">حرفة يدوية جزائرية</span>
                    </div>
                  )}

                  {/* Category Pill */}
                  {product.category && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#111417]/80 backdrop-blur-sm text-[#c5a059] border border-[#c5a059]/30">
                      {product.category}
                    </span>
                  )}

                  {/* Quick View Button */}
                  <button
                    onClick={() => setDetailProduct(product)}
                    className="absolute bottom-3 left-3 p-2 rounded-full bg-[#111417]/80 hover:bg-[#c5a059] text-white hover:text-black transition-colors"
                    title="معاينة التفاصيل الفنية"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#f5f2ea] group-hover:text-[#c5a059] transition-colors line-clamp-1 mb-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-[#a8abad] leading-relaxed line-clamp-2 mb-4">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#a8abad] block">السعر التقديري</span>
                      <span className="text-base font-extrabold text-[#c5a059]">
                        {product.price === null ? 'حسب القياس والطلب' : `${product.price.toLocaleString('ar-DZ')} دج`}
                      </span>
                    </div>

                    <a
                      href={whatsappLink(
                        `مرحباً ASLAN MODELLING، أود طلب المنتج: (${product.name}). أرجو تزويدي بالخيارات والأسعار حسب مقاسي.`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#c5a059] text-[#111417] hover:bg-[#d6b36e] transition-transform active:scale-95 shadow-md shadow-[#c5a059]/15"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>اطلب القطعة</span>
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Product Details Modal */}
        {detailProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir="rtl">
            <div className="relative w-full max-w-2xl bg-[#171b1e] border border-[#c5a059]/40 rounded-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setDetailProduct(null)}
                className="absolute top-4 left-4 p-2 text-[#a8abad] hover:text-[#f5f2ea] rounded-full hover:bg-white/5"
              >
                ✕
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                <div className="rounded-xl overflow-hidden h-64 bg-black/40">
                  <img
                    src={detailProduct.image_url || ''}
                    alt={detailProduct.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/30 mb-2">
                      {detailProduct.category}
                    </span>
                    <h3 className="text-xl font-bold text-[#f5f2ea] mb-2">{detailProduct.name}</h3>
                    <p className="text-xs text-[#a8abad] leading-relaxed mb-4">
                      {detailProduct.description}
                    </p>
                  </div>
                  <div className="p-3 bg-[#111417] rounded-xl border border-white/5">
                    <span className="text-xs text-[#a8abad] block">السعر المقترح:</span>
                    <span className="text-xl font-black text-[#c5a059]">
                      {detailProduct.price === null ? 'حسب القياس والتفصيل' : `${detailProduct.price.toLocaleString('ar-DZ')} دج`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Technical Specifications */}
              {detailProduct.features && Object.keys(detailProduct.features).length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-[#f5f2ea] mb-3">المواصفات الفنية والجودة:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(detailProduct.features).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111417] border border-white/5 text-xs text-[#f5f2ea]">
                        <Check className="w-4 h-4 text-[#c5a059] shrink-0" />
                        <span>{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => setDetailProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a8abad] hover:text-[#f5f2ea]"
                >
                  إغلاق
                </button>
                <a
                  href={whatsappLink(
                    `مرحباً ASLAN MODELLING، أود الاستفسار المفصل وطلب القطعة: ${detailProduct.name}`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#c5a059] text-[#111417] text-xs font-bold hover:bg-[#d6b36e]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>متابعة الطلب عبر واتساب</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
