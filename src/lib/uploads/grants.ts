import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { UnifiedUploadService } from './capability';

export type UploadGrant = {
  id: string;
  userId: string;
  service: UnifiedUploadService;
  resourceId: string;
  fileName: string;
  sizeBytes: number;
  expiresAt: number;
};

function secret(): string {
  const value = process.env.ASLAN_UPLOAD_GRANT_SECRET;
  if (!value || Buffer.byteLength(value, 'utf8') < 32)
    throw new Error('Upload grant signing secret is not configured');
  return value;
}

function signature(payload: string): Buffer {
  return createHmac('sha256', secret()).update(payload).digest();
}

/** Signed short-lived intent; gateway must ALSO enforce replay protection and ownership. */
export function issueUploadGrant(input: Omit<UploadGrant, 'id' | 'expiresAt'>): string {
  const grant: UploadGrant = { ...input, id: randomUUID(), expiresAt: Date.now() + 5 * 60_000 };
  const payload = Buffer.from(JSON.stringify(grant)).toString('base64url');
  return payload + '.' + signature(payload).toString('base64url');
}

export function verifyUploadGrant(token: string): UploadGrant | null {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) return null;
  const actual = Buffer.from(parts[1], 'base64url');
  const expected = signature(parts[0]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as UploadGrant;
    if (!data || typeof data.id !== 'string' || typeof data.userId !== 'string' ||
        !Number.isSafeInteger(data.expiresAt) || data.expiresAt < Date.now() ||
        data.expiresAt > Date.now() + 5 * 60_000 ||
        !Number.isSafeInteger(data.sizeBytes) || data.sizeBytes <= 0 || data.sizeBytes > 8 * 1024 ** 3) return null;
    return data;
  } catch { return null; }
}
