import { createClient } from '@/lib/supabase/server';
import type { IdempotencyRecord, IdempotencyStore } from '@/core/idempotency/types';

export class SupabaseIdempotencyStore implements IdempotencyStore {
  async has(key: string): Promise<boolean> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('idempotency_keys').select('id').eq('key', key).maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async put(record: IdempotencyRecord): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.from('idempotency_keys').insert({
      scope: 'core',
      key: record.key,
      status: 'processing',
      created_at: record.createdAt,
      expires_at: record.expiresAt ?? null,
    });
    if (error && error.code !== '23505') throw error;
  }
}
