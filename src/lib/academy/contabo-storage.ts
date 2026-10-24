import { createClient } from '@/lib/supabase/server';

/** File bytes live on Contabo; Supabase is used only for identity and lesson metadata. */
export function academyUploadBaseUrl(): string | null {
  const value = process.env.ACADEMY_UPLOAD_BASE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch { return null; }
}

export async function contaboAssetRequest(
  db: Awaited<ReturnType<typeof createClient>>,
  assetId: string,
  action: 'verify' | 'download-token' | 'purge',
): Promise<{ size?: number; mimeType?: string; sha256?: string; path?: string; deleted?: boolean } | null> {
  const base = academyUploadBaseUrl();
  if (!base) return null;
  const { data: { session } } = await db.auth.getSession();
  if (!session?.access_token) return null;
  try {
    const result = await fetch(base + '/assets/' + assetId + '/' + action, {
      method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token },
      cache: 'no-store', signal: AbortSignal.timeout(action === 'verify' ? 240000 : 20000),
    });
    if (!result.ok) return null;
    return result.json();
  } catch { return null; }
}
