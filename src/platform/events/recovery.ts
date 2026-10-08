import { createClient } from '@/lib/supabase/server';

export async function claimNextPlatformEvent(maxAttempts = 5) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('claim_platform_event', { p_max_attempts: maxAttempts });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function completePlatformEvent(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('platform_events').update({
    status: 'processed', processed_at: new Date().toISOString(), last_error: null,
  }).eq('id', id);
  if (error) throw error;
}

export async function failPlatformEvent(id: string, errorMessage: string, retryAt: Date) {
  const supabase = await createClient();
  const { error } = await supabase.from('platform_events').update({
    status: 'failed', available_at: retryAt.toISOString(), last_error: errorMessage,
  }).eq('id', id);
  if (error) throw error;
}
