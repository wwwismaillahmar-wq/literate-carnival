import { listServices } from '@/domains/services/service';
import { ServicesCatalog } from '@/components/services/ServicesCatalog';
import type { AslanService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'الخدمات المهنية — ASLAN Modelling Group',
  description: 'تصفح خدمات ASLAN في التنجيد والخياطة والكهرباء والتكييف والتدفئة والري وتجهيز الورشات. اطلب عرض سعر وتابع تنفيذ الخدمة.',
};
type Params = { q?: string; category?: string };
export default async function ServicesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  let services: AslanService[] = [];
  let error = false;
  try { services = (await listServices()) as AslanService[]; }
  catch { error = true; }
  return <ServicesCatalog services={services} error={error}
    initialQuery={typeof params.q === 'string' ? params.q : ''}
    initialCategory={typeof params.category === 'string' ? params.category : ''} />;
}
