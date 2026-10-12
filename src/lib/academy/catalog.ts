export const trainingFields = [
  { id: 'upholstery', title: 'التنجيد والديكور', description: 'حرفة الأثاث وتفاصيل المساحات', icon: 'sofa', keywords: ['تنجيد','ديكور','أثاث','اثاث','upholstery'] },
  { id: 'sewing', title: 'الخياطة والتفصيل', description: 'من الفكرة إلى القطعة المنجزة', icon: 'scissors', keywords: ['خياطة','تفصيل','نسيج','sewing'] },
  { id: 'electrical', title: 'الكهرباء الصناعية', description: 'التركيبات والأنظمة الكهربائية', icon: 'zap', keywords: ['كهرباء','كهربائي','electrical'] },
  { id: 'cooling', title: 'التبريد والتكييف', description: 'التحكم في الهواء والحرارة', icon: 'wind', keywords: ['تبريد','تكييف','cooling','hvac'] },
  { id: 'plumbing', title: 'التدفئة والأنابيب', description: 'الشبكات والتركيب والصيانة', icon: 'wrench', keywords: ['تدفئة','أنابيب','انابيب','سباكة','plumbing'] },
] as const;
export type FieldId = typeof trainingFields[number]['id'];
export type CoursePresentation = { field?: FieldId; cover?: string; featured?: boolean };
export type AcademyCourse = { id: string; title: string; description: string; duration: string; price: number | null; field: FieldId | 'general'; cover: string; featured: boolean };
export function isPublished(row: Record<string, unknown>): boolean {
  for (const key of ['published','is_published','is_active']) if (typeof row[key] === 'boolean') return row[key] as boolean;
  if (typeof row.visibility === 'string') return ['published','public'].includes(row.visibility.toLowerCase());
  if (typeof row.active === 'boolean') return row.active;
  return typeof row.status === 'string' && ['published','active','public'].includes(row.status.toLowerCase());
}
export function safeCover(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1500) return '';
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function safeInternalLink(value: string): string {
  return /^\/(?!\/)[a-zA-Z0-9/_?=&%.#-]*$/.test(value) && !value.includes('\\') ? value : '/academy#courses';
}
export function readPresentation(raw?: string): Record<string, CoursePresentation> {
  try {
    const parsed: unknown = JSON.parse(raw || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, value]) => /^[a-zA-Z0-9-]{1,120}$/.test(id) && value && typeof value === 'object' && !Array.isArray(value)).map(([id, value]) => {
      const item = value as Record<string, unknown>;
      return [id, { field: trainingFields.some(field => field.id === item.field) ? item.field : undefined, cover: safeCover(item.cover), featured: item.featured === true }];
    })) as Record<string, CoursePresentation>;
  } catch { return {}; }
}
export function normalizeCourse(row: Record<string, unknown>, presentation: CoursePresentation = {}): AcademyCourse {
  const text = (keys: string[], fallback = '') => {
    for (const key of keys) if (typeof row[key] === 'string' && (row[key] as string).trim()) return (row[key] as string).trim();
    return fallback;
  };
  const title = text(['title','name','course_name'], 'الدورة');
  const description = text(['description','summary','details']);
  const haystack = (title + ' ' + description).toLowerCase();
  const field = presentation.field || trainingFields.find(item => item.keywords.some(word => haystack.includes(word)))?.id || 'general';
  const rawPrice = row.price_dzd ?? row.price;
  const price = rawPrice === null || rawPrice === undefined || rawPrice === '' ? null : Number(rawPrice);
  return { id: String(row.id), title, description, duration: text(['duration']), price: price !== null && Number.isFinite(price) && price >= 0 ? price : null, field, cover: safeCover(presentation.cover), featured: presentation.featured === true };
}
export function fieldTitle(field: AcademyCourse['field']) { return trainingFields.find(item => item.id === field)?.title || 'تكوين مهني'; }
export function coursePrice(price: number | null) { return price === null ? 'السعر غير معلن' : price === 0 ? 'مجانية' : new Intl.NumberFormat('ar-DZ').format(price) + ' دج'; }
export function filterCourses(courses: AcademyCourse[], field: string, query: string) {
  const search = query.trim().toLocaleLowerCase('ar').normalize('NFKC');
  return courses.filter(course => (!field || course.field === field) && (course.title + ' ' + course.description + ' ' + fieldTitle(course.field)).toLocaleLowerCase('ar').normalize('NFKC').includes(search));
}
