/** Parse a TUS response offset without silently converting a missing header to zero. */
export function parseTusOffset(headers: Pick<Headers, 'get'>, fileSize: number): number {
  const raw = headers.get('Upload-Offset');
  if (raw === null || !/^(0|[1-9][0-9]*)$/.test(raw)) {
    throw new Error('Invalid or missing TUS Upload-Offset');
  }
  const offset = Number(raw);
  if (!Number.isSafeInteger(fileSize) || fileSize <= 0 ||
      !Number.isSafeInteger(offset) || offset > fileSize) {
    throw new Error('TUS offset exceeds the declared file size');
  }
  return offset;
}

/** HEAD must describe the same immutable upload, not a different reused upload URL. */
export function assertTusLength(headers: Pick<Headers, 'get'>, fileSize: number): void {
  const raw = headers.get('Upload-Length');
  if (raw === null || !/^[1-9][0-9]*$/.test(raw) ||
      !Number.isSafeInteger(fileSize) || Number(raw) !== fileSize) {
    throw new Error('TUS upload length does not match selected file');
  }
}

/** A lost PATCH response is not proof that the server rejected its bytes. */
export async function recoverTusOffset(
  url: string,
  fileSize: number,
  previousOffset: number,
  head: (url: string) => Promise<Pick<Response, 'headers' | 'status'>>,
): Promise<number> {
  const response = await head(url);
  // Never trust offset headers from an unauthorized, missing or failed HEAD.
  if (response.status !== 200 && response.status !== 204) {
    throw new Error('TUS HEAD failed with status ' + response.status);
  }
  assertTusLength(response.headers, fileSize);
  const offset = parseTusOffset(response.headers, fileSize);
  if (!Number.isSafeInteger(previousOffset) || previousOffset < 0 || offset < previousOffset) {
    throw new Error('TUS server offset regressed');
  }
  return offset;
}
