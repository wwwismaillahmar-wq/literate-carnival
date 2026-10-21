import { NextResponse } from 'next/server';
import { authorizeUpload } from '@/lib/uploads/authorization';
import { UNIFIED_UPLOAD_TARGET_BYTES } from '@/lib/uploads/capability';

export const dynamic = 'force-dynamic';

/** Staged endpoint. Never returns an upload URL before the TUS gateway,
 * server-side token validation and completion hooks have been verified.
 */
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin)
        return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 });
    } catch {
      return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
    }
  }
  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  if (!payload || typeof payload !== 'object')
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  const result = await authorizeUpload({ service: (payload as Record<string, unknown>).service, resourceId: (payload as Record<string, unknown>).resourceId, fileName: (payload as Record<string, unknown>).fileName, sizeBytes: (payload as Record<string, unknown>).sizeBytes });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({
    error: 'Resumable upload gateway is not activated yet',
    code: 'UPLOAD_GATEWAY_NOT_READY',
    targetMaxBytes: UNIFIED_UPLOAD_TARGET_BYTES,
  }, { status: 503 });
}
