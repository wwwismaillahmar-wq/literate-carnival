import type { LocalizedText } from '@/lib/i18n/content';
/** Public service presentation taxonomy. No dependency on unapproved database categories. */
export type AslanService = { id: string; name: string; slug: string; description: string; nameTranslations?: LocalizedText | null; descriptionTranslations?: LocalizedText | null };
export const serviceCategories = [
  { id: 'all', label: 'كل الخدمات', summary: 'تصفح جميع المجالات' },
  { id: 'craft', label: 'التنجيد والخياطة', summary: 'الأثاث والمفروشات والتفصيل' },
  { id: 'electrical', label: 'الكهرباء والورشات', summary: 'الأنظمة الكهربائية وتجهيز الورشات' },
  { id: 'climate', label: 'التبريد والتكييف', summary: 'تركيب الأجهزة وصيانتها' },
  { id: 'water', label: 'المياه والتدفئة والري', summary: 'الشبكات والأنابيب وأنظمة الري' },
  { id: 'other', label: 'خدمات إضافية', summary: 'خدمات تخصصية أخرى' },
] as const;
export type ServiceCategory = (typeof serviceCategories)[number]['id'];
const categoriesBySlug: Record<string, ServiceCategory> = {
  'upholstery': 'craft',
  'sewing-tailoring': 'craft',
  'electrical': 'electrical',
  'workshop-setup': 'electrical',
  'refrigeration-ac': 'climate',
  'plumbing-heating': 'water',
  'irrigation': 'water',
};
export function serviceCategory(service: Pick<AslanService, 'slug'>): ServiceCategory {
  return categoriesBySlug[service.slug] ?? 'other';
}
export function categoryLabel(category: ServiceCategory): string {
  return serviceCategories.find(item => item.id === category)?.label ?? 'خدمات إضافية';
}
export function serviceRequestUrl(slug: string): string {
  return '/service-requests?service=' + encodeURIComponent(slug);
}
