import { useState } from 'react';
import { Camera, ZoomIn, X, MessageCircle } from 'lucide-react';
import { GALLERY_DATA } from '../lib/data';
import type { GalleryItem } from '../types';
import { whatsappLink } from '../lib/config';

export function WorkGallery() {
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);

  return (
    <section id="gallery" className="py-20 border-b border-[#c5a059]/20 bg-[#14181b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-1">
              <Camera className="w-3.5 h-3.5" />
              <span>PORTFOLIO & ATELIER</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f2ea]">
              معرض الأعمال والتشطيبات الحرفية
            </h2>
          </div>
          <div className="text-xs text-[#a8abad]">
            نماذج حقيقية من إنجازات ورشاتنا في الصالونات والمشاريع التجارية
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GALLERY_DATA.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="group relative h-72 rounded-2xl overflow-hidden cursor-pointer bg-[#1b2024] border border-[#c5a059]/20 hover:border-[#c5a059]/60 transition-all shadow-lg"
            >
              <img
                src={item.image_url}
                alt={item.caption || 'عمل منجز من ASLAN'}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />

              {/* Gradient Overlay with Caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity p-6 flex flex-col justify-end">
                <p className="text-xs sm:text-sm font-bold text-[#f5f2ea] leading-snug mb-2">
                  {item.caption}
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-[#c5a059]">
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>انقر للتكبير والتفاصيل</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lightbox Modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            dir="rtl"
          >
            <div className="relative max-w-3xl w-full bg-[#171b1e] rounded-2xl border border-[#c5a059]/40 overflow-hidden">
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 left-4 z-10 p-2 rounded-full bg-black/60 text-white hover:text-[#c5a059]"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="h-96 w-full bg-black flex items-center justify-center overflow-hidden">
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.caption || ''}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm font-bold text-[#f5f2ea]">{selectedItem.caption}</p>
                <a
                  href={whatsappLink(
                    `مرحباً ASLAN MODELLING، رأيت صورة الإنجاز في المعرض: (${selectedItem.caption}) وأود طلب نفس التصميم أو معرفة تكلفته.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#c5a059] text-[#111417] text-xs font-bold hover:bg-[#d6b36e] whitespace-nowrap"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>اطلب تصميماً مماثلاً عبر واتساب</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
