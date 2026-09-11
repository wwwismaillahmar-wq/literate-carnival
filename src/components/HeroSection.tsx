import { Sparkles, Scissors, CheckCircle, ArrowDown, ShieldCheck } from 'lucide-react';
import { site, whatsappLink } from '../lib/config';

interface HeroSectionProps {
  onNavigate: (sectionId: string) => void;
  onOpenAudit: () => void;
}

export function HeroSection({ onNavigate, onOpenAudit }: HeroSectionProps) {
  return (
    <section id="home" className="relative pt-12 pb-20 border-b border-[#c5a059]/20 overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-40 w-96 h-96 bg-[#c5a059]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Main Hero Copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#c5a059]/40 bg-[#c5a059]/10 text-[#c5a059] text-xs font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{site.name} — الجزائر</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#f5f2ea] leading-[1.3]">
              علامة تجمع <span className="text-[#c5a059] italic">الحرفة</span>، الجودة، والتكوين.
            </h1>

            <p className="text-base sm:text-lg text-[#a8abad] leading-relaxed max-w-2xl font-normal">
              منصة رقمية رائدة متخصصة في أعمال التنجيد الراقي، الخياطة والتفصيل المخصص، تجهيز المساحات التجارية والمقاهي، إلى جانب دورات تكوينية متخصصة وبوابة مستقلة للشركاء.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('products')}
                className="px-6 py-3 rounded-full bg-[#c5a059] text-[#111417] font-bold text-sm hover:bg-[#d6b36e] transition-all active:scale-95 shadow-lg shadow-[#c5a059]/20 flex items-center gap-2"
              >
                <span>استكشف المنتجات</span>
                <ArrowDown className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('services')}
                className="px-6 py-3 rounded-full border border-[#c5a059] text-[#c5a059] hover:bg-[#c5a059]/10 font-bold text-sm transition-all"
              >
                اطلب خدمة مخصصة
              </button>

              <button
                onClick={onOpenAudit}
                className="px-4 py-3 rounded-full border border-white/20 text-[#a8abad] hover:text-[#f5f2ea] hover:border-white/40 text-xs font-semibold transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-[#c5a059]" />
                <span>حالة مزامنة المستودع</span>
              </button>
            </div>

            {/* Value Props Checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10 text-xs text-[#a8abad]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>تنفيذ حسب المقاس والطلب</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>أقمشة وإسفنج عالي الكثافة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#c5a059] shrink-0" />
                <span>توصيل وتركيب لكافة الولايات</span>
              </div>
            </div>
          </div>

          {/* Luxury Brand Emblem Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-md p-8 rounded-2xl bg-[#171b1e] border border-[#c5a059]/40 shadow-2xl shadow-black/60 overflow-hidden group">
              {/* Gold decorative border accents */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#c5a059]/10 rounded-bl-full pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#c5a059]/5 rounded-tr-full pointer-events-none" />

              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059]">
                  <Scissors className="w-8 h-8 rotate-45" />
                </div>

                <div>
                  <h2 className="text-4xl font-extrabold tracking-widest text-[#c5a059] font-latin-display">
                    ASLAN
                  </h2>
                  <p className="text-xs uppercase tracking-[0.4em] text-[#a8abad] mt-1 font-mono">
                    MODELLING
                  </p>
                </div>

                <div className="h-[1px] w-24 mx-auto bg-gradient-to-r from-transparent via-[#c5a059] to-transparent" />

                <p className="text-sm font-bold text-[#f5f2ea] tracking-wider">
                  تنجيد • خياطة • تفصيل
                </p>

                <p className="text-xs text-[#a8abad] leading-relaxed max-w-xs mx-auto">
                  حرفة يدوية جزائرية متقونة، تصاميم عصرية، ومواصفات تدوم طويلاً للمنازل والفنادق والمؤسسات التجارية.
                </p>

                <div className="pt-4 flex items-center justify-center gap-2 text-[11px] text-[#c5a059] bg-[#111417] py-2 px-3 rounded-lg border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
                  <span>الورشة جاهزة لاستقبال طلبياتكم عبر الواتساب</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
