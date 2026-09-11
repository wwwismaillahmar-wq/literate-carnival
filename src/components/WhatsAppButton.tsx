import { MessageCircle } from 'lucide-react';
import { whatsappLink } from '../lib/config';

export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink('مرحباً ASLAN MODELLING، أود الاستفسار عن خدمات ومنتجات الورشة.')}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="تواصل مباشر عبر واتساب"
      className="fixed bottom-6 left-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-[#25d366] text-[#07170c] shadow-2xl hover:scale-110 active:scale-95 transition-all group"
    >
      <MessageCircle className="w-7 h-7 fill-current" />
      {/* Tooltip on hover */}
      <span className="absolute right-16 px-3 py-1.5 rounded-xl bg-[#171b1e] border border-white/10 text-white text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
        تحدث معنا عبر واتساب
      </span>
    </a>
  );
}
