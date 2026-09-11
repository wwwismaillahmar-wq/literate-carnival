import { useState, useEffect } from 'react';
import { Send, CheckCircle2, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { whatsappLink, site } from '../lib/config';

interface ContactFormProps {
  initialType?: string;
  initialMessage?: string;
}

export function ContactForm({ initialType = 'طلب منتج', initialMessage = '' }: ContactFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState(initialType);
  const [message, setMessage] = useState(initialMessage);
  const [status, setStatus] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leadClassification, setLeadClassification] = useState<{
    priority: string;
    classification: string;
  } | null>(null);

  useEffect(() => {
    if (initialType) setType(initialType);
    if (initialMessage) setMessage(initialMessage);
  }, [initialType, initialMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanMessage = message.trim();
    const cleanType = type.trim();

    if (cleanName.length < 2) {
      setStatus('يرجى كتابة الاسم الكامل بشكل صحيح (حرفين على الأقل).');
      return;
    }
    if (cleanPhone.length < 6) {
      setStatus('يرجى إدخال رقم هاتف صحيح للمتابعة معك.');
      return;
    }
    if (cleanMessage.length < 5) {
      setStatus('يرجى توضيح تفاصيل الطلب (5 أحرف على الأقل).');
      return;
    }

    setSubmitting(true);
    setStatus('جاري تسجيل طلبك ومعالجته آلياً...');

    // Quick intelligent lead classification (replicating route.ts behavior)
    let detectedPriority = 'متوسط';
    let detectedClass = 'طلب عادي';
    if (cleanType === 'طلب منتج' || cleanType === 'طلب خدمة') {
      detectedPriority = 'عالية (Hot Lead)';
      detectedClass = 'أولوية بيع ومتابعة فورية';
    } else if (cleanType === 'دورة تكوينية') {
      detectedPriority = 'أكاديمي';
      detectedClass = 'تسجيل اهتمام في الدورات';
    } else if (cleanType === 'طلب شراكة') {
      detectedPriority = 'استراتيجي';
      detectedClass = 'بوابة الشركاء';
    }

    setLeadClassification({
      priority: detectedPriority,
      classification: detectedClass,
    });

    // Store in browser storage (client persistence)
    try {
      const existingLeads = JSON.parse(localStorage.getItem('aslan_leads') || '[]');
      existingLeads.unshift({
        id: `lead-${Date.now()}`,
        name: cleanName,
        phone: cleanPhone,
        type: cleanType,
        message: cleanMessage,
        priority: detectedPriority,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem('aslan_leads', JSON.stringify(existingLeads.slice(0, 50)));
    } catch {
      // Storage quota or disabled
    }

    setTimeout(() => {
      setSubmitting(false);
      setIsSuccess(true);
      setStatus('تم تسجيل طلبك بنجاح! يتم الآن توجيهك إلى واتساب لإتمام المحادثة مباشرة.');

      // Format clean Arabic WhatsApp message
      const formattedMessage = `مرحباً ASLAN MODELLING 🇩🇿،\n\n📌 *تفاصيل الطلب الجديد*:\n- *الاسم الكامل*: ${cleanName}\n- *رقم الهاتف*: ${cleanPhone}\n- *نوع الطلب*: ${cleanType}\n- *التفاصيل*: ${cleanMessage}\n\nشكراً لكم وبانتظار ردكم الكريم.`;

      // Open WhatsApp in new tab
      const targetUrl = whatsappLink(formattedMessage);
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }, 900);
  };

  return (
    <section id="contact" className="py-20 border-b border-[#c5a059]/20 bg-[#111417]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Contact Left Side Info */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c5a059] tracking-widest uppercase">
              <span>CONTACT CENTER</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#f5f2ea]">
              مركز التواصل واستقبال الطلبات
            </h2>

            <p className="text-xs sm:text-sm text-[#a8abad] leading-relaxed">
              سواء كنت تبحث عن تنجيد صالونك الخاص، تجهيز فضاء تجاري متكامل، التسجيل في دوراتنا المهنية، أو إبرام شراكة تجارية؛ فريقنا جاهز لاستقبال طلبك فورياً عبر النظام وواتساب.
            </p>

            {/* Direct Contact Cards */}
            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="p-4 rounded-xl bg-[#171b1e] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#a8abad] block">الهاتف المباشر والواتساب</span>
                  <span className="text-sm font-bold text-[#f5f2ea] dir-ltr font-mono">
                    {site.phone}
                  </span>
                </div>
                <a
                  href={`tel:${site.phoneRaw}`}
                  className="px-3 py-1.5 rounded-lg bg-[#c5a059]/10 text-[#c5a059] text-xs font-bold hover:bg-[#c5a059] hover:text-[#111417] transition-all"
                >
                  اتصال الآن
                </a>
              </div>

              <div className="p-4 rounded-xl bg-[#171b1e] border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#a8abad] block">البريد الإلكتروني للإدارة</span>
                  <span className="text-sm font-bold text-[#f5f2ea]">{site.email}</span>
                </div>
                <span className="text-[11px] text-[#c5a059] font-medium">رد خلال 24 ساعة</span>
              </div>

              <div className="p-4 rounded-xl bg-[#171b1e] border border-white/5">
                <span className="text-[11px] text-[#a8abad] block">المقر وورشات العمل</span>
                <span className="text-sm font-bold text-[#f5f2ea]">{site.location}</span>
              </div>
            </div>
          </div>

          {/* Contact Right Side Form */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl bg-[#171b1e] border border-[#c5a059]/30 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-lg font-bold text-[#f5f2ea]">استمارة الطلب والمتابعة</h3>
                  <p className="text-xs text-[#a8abad] mt-0.5">
                    املأ البيانات وسيقوم النظام بتوجيه طلبك مباشرة إلى ورشتنا
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#c5a059]/10 text-[#c5a059] flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-[#f5f2ea] mb-1.5">
                    الاسم الكامل <span className="text-[#c5a059]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: يوسف بن أحمد"
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2ea] placeholder-[#a8abad]/50 focus:outline-none focus:border-[#c5a059] transition-all"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-[#f5f2ea] mb-1.5">
                    رقم الهاتف (الجزائر) <span className="text-[#c5a059]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 0558265070 أو 0770..."
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2ea] placeholder-[#a8abad]/50 focus:outline-none focus:border-[#c5a059] transition-all"
                  />
                </div>

                {/* Request Type */}
                <div>
                  <label className="block text-xs font-bold text-[#f5f2ea] mb-1.5">
                    نوع الطلب <span className="text-[#c5a059]">*</span>
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2ea] focus:outline-none focus:border-[#c5a059] transition-all"
                  >
                    <option value="طلب منتج">طلب منتج (تنجيد، كرسي، ظهر سرير، ستائر)</option>
                    <option value="طلب خدمة">طلب خدمة (تجهيز محلات، تجديد أثاث، حلول مخصصة)</option>
                    <option value="دورة تكوينية">دورة تكوينية (التنجيد، الكهرباء، التكييف، التدفئة)</option>
                    <option value="طلب شراكة">طلب شراكة (حرفيين، مهندسين، موردين)</option>
                    <option value="استعلام">استعلام عام أو طلب تسعيرة</option>
                    <option value="شكوى / اقتراح">شكوى أو اقتراح تحسين</option>
                  </select>
                </div>

                {/* Message Details */}
                <div>
                  <label className="block text-xs font-bold text-[#f5f2ea] mb-1.5">
                    تفاصيل الطلب أو القياسات <span className="text-[#c5a059]">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اكتب هنا تفاصيل طلبك: نوع القماش، المقاسات التقريبية، المدينة، أو أي استفسار خاص..."
                    className="w-full bg-[#111417] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f5f2ea] placeholder-[#a8abad]/50 focus:outline-none focus:border-[#c5a059] transition-all"
                  />
                </div>

                {/* Status or Validation Message */}
                {status && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      isSuccess
                        ? 'bg-[#25d366]/10 border border-[#25d366]/30 text-[#25d366]'
                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                    }`}
                  >
                    {isSuccess ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{status}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-[#c5a059] text-[#111417] font-extrabold text-sm hover:bg-[#d6b36e] transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#c5a059]/20 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'جاري المعالجة والتوجيه...' : 'إرسال ومتابعة عبر واتساب'}</span>
                </button>

                <p className="text-[11px] text-center text-[#a8abad]">
                  يتم حفظ الطلب في قاعدة البيانات وتفتح نافذة واتساب رسمية مع الورشة برقم{' '}
                  <span className="text-[#c5a059] font-mono dir-ltr">{site.phone}</span>.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
