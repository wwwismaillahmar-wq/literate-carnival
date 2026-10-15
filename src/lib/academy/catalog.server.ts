import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { isPublished, normalizeCourse, readPresentation } from './catalog';
export async function getAcademyCatalog() {
  const db = await createClient();
  const [courseResult, settingsResult] = await Promise.all([
    db.from('courses').select('*').order('created_at', { ascending: false }).limit(500),
    db.from('site_settings').select('setting_key,setting_value').eq('is_public', true),
  ]);
  const settings: Record<string,string> = Object.fromEntries((settingsResult.data ?? []).map(row => [row.setting_key, row.setting_value ?? '']));
  const presentation = readPresentation(settings.academy_catalog);
  const courses = (courseResult.data ?? []).filter(row => isPublished(row as Record<string,unknown>)).map(row => normalizeCourse(row as Record<string,unknown>, presentation[String(row.id)]));
  return { courses, settings, error: Boolean(courseResult.error), settingsError: Boolean(settingsResult.error) };
}
