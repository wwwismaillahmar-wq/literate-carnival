import type { CorrelationId, EntityId, Timestamp } from '../shared';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'AUTHORIZE'
  | 'REVOKE'
  | 'EXPORT'
  | 'OTHER';

export interface AuditRecord {
  id: EntityId;
  occurredAt: Timestamp;
  actorId?: EntityId;
  action: AuditAction;
  resourceType: string;
  resourceId?: EntityId;
  success: boolean;
  correlationId?: CorrelationId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AuditWriter {
  record(entry: AuditRecord): Promise<void>;
}
