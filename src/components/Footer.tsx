import { site, whatsappLink } from '../lib/config';
import { SOCIAL_LINKS } from '../lib/data';
import { Scissors, ShieldCheck, Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
  onOpenAudit: () => void;
}

export function Footer({ onNavigate, onOpenAudit }: FooterProps) {
  return (
    <footer className="bg-[#0e1114] border-t border-[#c5a059]/20 text-[#f5f2ea] pt-16 pb-12" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-[#c5a059] font-latin-display">
                ASLAN
              </span>
              <span className="text-xs uppercase tracking-[0.25em] text-[#a8abad]">
                modelling
              </span>
            </div>

            <p className="text-xs font-bold text-[#c5a059]">
              {site.tagline}
            </p>

            <p className="text-xs text-[#a8abad] leading-relaxed max-w-sm">
              علامة تجمع الحرفة، الجودة، والتكوين. نبتكر في صناعة الأثاث والتنجيد والتفصيل الراقي، ونشارك خبراتنا المهنية عبر دورات معتمدة وبوابة شراكات للمؤسسات بالجزائر.
            </p>

            <div className="pt-2">
              <button
                onClick={onOpenAudit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#c5a059] border border-[#c5a059]/30 rounded-full hover:bg-[#c5a059]/10 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>حالة تدقيق المستودع والمرفقات (Verified)</span>
              </button>
            </div>
          </div>

          {/* Quick Section Links */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">
              أقسام المنصة
            </h4>
            <ul className="space-y-2 text-xs text-[#a8abad]">
              <li>
                <button
                  onClick={() => onNavigate('products')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  المنتجات وتفصيل الصالونات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('services')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  تجهيز المحلات والمساحات التجارية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('courses')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  أكاديمية الدورات التكوينية
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('partners')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  بوابة الشركاء والموردين
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('gallery')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  معرض الأعمال والتشطيبات
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-[#c5a059] transition-colors"
                >
                  مركز الطلبات والتواصل
                </button>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">
              بيانات التواصل المباشر
            </h4>
            <div className="space-y-2 text-xs text-[#a8abad]">
              <p>
                الهاتف والواتساب: <br />
                <a
                  href={`tel:${site.phoneRaw}`}
                  className="text-[#f5f2ea] font-mono dir-ltr hover:text-[#c5a059] transition-colors block mt-0.5"
                >
                  {site.phone}
                </a>
              </p>
              <p>
                البريد الإلكتروني: <br />
                <span className="text-[#f5f2ea]">{site.email}</span>
              </p>
              <p>
                الورشة والمقر: <br />
                <span className="text-[#f5f2ea]">{site.location}</span>
              </p>
            </div>
          </div>

          {/* Social Channels */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-[#c5a059] uppercase tracking-wider">
              تابعنا على الشبكات
            </h4>
            <div className="flex flex-col gap-2 text-xs">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#a8abad] hover:text-[#c5a059] transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#c5a059]" />
                  <span>{s.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#a8abad]">
          <p>© 2026 {site.name}. جميع الحقوق محفوظة بالجزائر.</p>
          <div className="flex items-center gap-4">
            <span>مرخص بموجب MPL-2.0</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              صُنع بحرفة وإتقان جزائري <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
