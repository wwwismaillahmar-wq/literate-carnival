export const site = {
  name: 'ASLAN MODELLING',
  brandArabic: 'أصلان موديلينغ',
  tagline: 'تنجيد • خياطة • تفصيل',
  taglineFull: 'علامة تجمع الحرفة، الجودة، والتكوين',
  description: 'منصة رقمية متكاملة لمنتجات التنجيد والخياطة والتفصيل، وتجهيز المحلات والمساحات التجارية، مع أكاديمية التكوين المهني وبوابة الشركاء.',
  phone: '+213 558 265 070',
  phoneRaw: '213558265070',
  whatsapp: '213558265070',
  email: 'contact@aslan-modelling.com',
  location: 'الجزائر — تيبازة / العاصمة',
  instagram: 'https://instagram.com/aslan_modelling',
  facebook: 'https://facebook.com/aslan_modelling',
  tiktok: 'https://tiktok.com/@aslan_modelling',
  telegram: 'https://t.me/+213558265070',
  repo: 'wwwismaillahmar-wq/literate-carnival',
  supabaseHost: 'tvdvzmmvpzfqenwyemem.supabase.co',
} as const;

export function whatsappLink(message: string): string {
  return `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(message)}`;
}

export function phoneLink(): string {
  return `tel:+${site.phoneRaw}`;
}
