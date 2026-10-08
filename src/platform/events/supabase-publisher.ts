import type { CoreEvent, EventPublisher } from '@/core/events/types';
import { createClient } from '@/lib/supabase/server';

export class SupabaseEventPublisher implements EventPublisher {
  async publish<TPayload>(event: CoreEvent<TPayload>): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc('enqueue_platform_event', {
      p_event_name: String(event.name),
      p_aggregate_type: event.aggregateType,
      p_aggregate_id: String(event.aggregateId),
      p_correlation_id: event.correlationId ? String(event.correlationId) : null,
      p_idempotency_key: String(event.id),
      p_payload: event.payload,
    });
    if (error) throw error;
  }
}
