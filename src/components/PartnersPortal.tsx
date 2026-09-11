import { Handshake, Building2, Users, FileCheck2, MessageCircle } from 'lucide-react';
import { whatsappLink } from '../lib/config';

interface PartnersPortalProps {
  onApplyPartner: () => void;
}

export function PartnersPortal({ onApplyPartner }: PartnersPortalProps) {
  const partnerTypes = [
    {
      title: 'الحرفيون والورشات الفرعية',
      description: 'تعاون إنتاجي في تلبية الطلبات الكبرى وتصنيع الهياكل أو خياطة الأغطية بجودة متفق عليها.',
      icon: Users,
    },
    {
      title: 'مهندسو الديكور والمعماريون',
      description: 'تنفيذ تصاميمكم الحصرية لعملائكم في الفنادق، الشقق الفاخرة، والمطاعم مع ضمان أسبقية التنفيذ والخصومات الخاصة.',
      icon: Building2,
    },
    {
      title: 'موردو الأقمشة والمواد الأولية',
      description: 'شراكات توريد موثوقة لأفضل أنواع المخمل، الجلود الصناعية، الأخشاب الطبيعية، ومستلزمات التنجيد.',
      icon: Handshake,
    },
  ];

  return (
    <section id="partners" className="py-20 border-b border-[#c5a059]/20 bg-[#111417]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase mb-1">
              <Handshake className="w-3.5 h-3.5" />
              <span>PARTNERS NETWORK</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#f5f2ea]">
              بوابة الشركاء الاستراتيجيين
            </h2>
          </div>
          <div className="text-xs text-[#a8abad]">
            فرص تعاون مستدام ومشاريع مشتركة للأفراد والشركات
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Partnership Types Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {partnerTypes.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-[#171b1e] border border-white/10 hover:border-[#c5a059]/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 text-[#c5a059] flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-[#f5f2ea] mb-2">{item.title}</h3>
                    <p className="text-xs text-[#a8abad] leading-relaxed">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Callout Card */}
          <div className="lg:col-span-4 p-8 rounded-2xl bg-[#171b1e] border border-[#c5a059]/40 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#c5a059]">
                <FileCheck2 className="w-4 h-4" />
                <span>برنامج الشراكة المعتمد</span>
              </div>
              <h3 className="text-xl font-bold text-[#f5f2ea]">انضم إلى شبكة شركاء ASLAN</h3>
              <p className="text-xs text-[#a8abad] leading-relaxed">
                سجل بيانات ورشتك أو مؤسستك لبحث سبل التعاون وتوقيع اتفاقيات توزيع وتوريد وتصنيع حصرية.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={onApplyPartner}
                className="w-full py-3 rounded-full bg-[#c5a059] text-[#111417] text-xs font-bold hover:bg-[#d6b36e] transition-all shadow-md shadow-[#c5a059]/15"
              >
                تقديم طلب شراكة الآن
              </button>
              <a
                href={whatsappLink('مرحباً إدارة ASLAN MODELLING، نود مناقشة فرصة شراكة تجارية / حرفية معكم.')}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-white/20 text-[#a8abad] hover:text-[#f5f2ea] text-xs font-semibold"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>تواصل مع قسم الشراكات</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
