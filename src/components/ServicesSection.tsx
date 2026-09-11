import { Briefcase, CheckCircle2, MessageCircle, ArrowLeft } from 'lucide-react';
import { SERVICES_DATA } from '../lib/data';
import { whatsappLink } from '../lib/config';

interface ServicesSectionProps {
  onSelectServiceForContact: (serviceTitle: string) => void;
}

export function ServicesSection({ onSelectServiceForContact }: ServicesSectionProps) {
  return (
    <section id="services" className="py-20 border-b border-[#c5a059]/20 bg-[#111417]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>SERVICES & CONTRACTING</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f2ea]">
              الخدمات والمشاريع المخصصة
            </h2>
          </div>
          <div className="text-xs text-[#a8abad]">
            حلول شاملة للأفراد، المحلات التجارية، المقاهي، والفنادق
          </div>
        </div>

        {/* 3 Services Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {SERVICES_DATA.map((service) => (
            <div
              key={service.number}
              className="relative p-8 rounded-2xl bg-[#171b1e] border border-[#c5a059]/20 hover:border-[#c5a059]/60 transition-all duration-300 flex flex-col justify-between group shadow-xl shadow-black/40 hover:-translate-y-1"
            >
              {/* Decorative Number Badge */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-4xl font-black text-[#c5a059]/30 font-latin-display group-hover:text-[#c5a059] transition-colors">
                  {service.number}
                </span>
                {service.badge && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#c5a059]/10 text-[#c5a059] border border-[#c5a059]/30">
                    {service.badge}
                  </span>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#f5f2ea] mb-3 group-hover:text-[#c5a059] transition-colors">
                  {service.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#a8abad] leading-relaxed mb-6">
                  {service.description}
                </p>

                {/* Features list */}
                {service.features && (
                  <div className="space-y-2 mb-8 border-t border-white/5 pt-4">
                    {service.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#f5f2ea]/90">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <button
                  onClick={() => onSelectServiceForContact(service.title)}
                  className="text-xs font-bold text-[#c5a059] hover:text-[#d6b36e] flex items-center gap-1 transition-colors"
                >
                  <span>تقديم طلب الخدمة</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                <a
                  href={whatsappLink(`مرحباً ASLAN MODELLING، أود الاستفسار وطلب الخدمة: (${service.title}).`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-[#c5a059]/10 hover:bg-[#c5a059] text-[#c5a059] hover:text-[#111417] transition-all"
                  title="استفسار سريع عبر واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
