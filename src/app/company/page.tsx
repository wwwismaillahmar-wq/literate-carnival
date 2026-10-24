import { createClient } from '@/lib/supabase/server';
import { CompanyLanding } from '@/components/company/CompanyLanding';

export default async function CompanyPage() {
  const db = await createClient();
  const { data } = await db.from('company_content').select('content_type').eq('published', true);
  return <CompanyLanding publishedTypes={(data ?? []).map(item => item.content_type)} />;
}
