import { createClient } from '@/lib/supabase/server';
import { TalentDirectoryContent } from '@/components/talent/TalentDirectoryContent';

export const dynamic = 'force-dynamic';

export default async function TalentDirectoryPage() {
  const db = await createClient();
  const { data: profiles, error } = await db.from('talent_profiles')
    .select('id,headline,bio,skills,updated_at')
    .eq('public_profile', true)
    .eq('review_status', 'verified')
    .order('updated_at', { ascending: false })
    .limit(100);

  return <TalentDirectoryContent profiles={profiles ?? []} hasError={Boolean(error)} />;
}
