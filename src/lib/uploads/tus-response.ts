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
