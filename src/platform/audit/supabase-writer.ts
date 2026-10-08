import type { AuditRecord, AuditWriter } from '@/core/audit/types';
import { createClient } from '@/lib/supabase/server';

export class SupabaseAuditWriter implements AuditWriter {
  async record(entry: AuditRecord): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc('write_audit_log', {
      p_action: entry.action,
      p_resource_type: entry.resourceType,
      p_resource_id: entry.resourceId ? String(entry.resourceId) : null,
      p_success: entry.success,
      p_correlation_id: entry.correlationId ? String(entry.correlationId) : null,
      p_before: entry.before ?? null,
      p_after: entry.after ?? null,
      p_metadata: entry.metadata ?? {},
    });
    if (error) throw error;
  }
}
