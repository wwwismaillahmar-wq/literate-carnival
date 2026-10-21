/** Shared transport capability, not a claim that a storage backend is ready.
 * Never bypass per-service authorization or the currently enforced provider limit.
 */
export const UNIFIED_UPLOAD_TARGET_BYTES = 8 * 1024 ** 3;
export const UNIFIED_UPLOAD_PROTOCOL = 'tus-resumable' as const;
export const UNIFIED_UPLOAD_SERVICES = [
  'academy', 'market', 'community', 'messages', 'services', 'admin', 'partners',
] as const;
export type UnifiedUploadService = (typeof UNIFIED_UPLOAD_SERVICES)[number];

export function validateUnifiedUploadSize(sizeBytes: number): boolean {
  return Number.isSafeInteger(sizeBytes) && sizeBytes > 0 && sizeBytes <= UNIFIED_UPLOAD_TARGET_BYTES;
}

export function isUnifiedUploadService(value: unknown): value is UnifiedUploadService {
  return typeof value === 'string' && UNIFIED_UPLOAD_SERVICES.some(service => service === value);
}
