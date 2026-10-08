const MIME_LIMITS: Record<string, number> = {
  'image/jpeg': 50 * 1024 * 1024,
  'image/png': 50 * 1024 * 1024,
  'image/webp': 50 * 1024 * 1024,
  'image/gif': 50 * 1024 * 1024,
  'video/mp4': 50 * 1024 * 1024,
  'video/webm': 50 * 1024 * 1024,
  'video/quicktime': 50 * 1024 * 1024,
};

export function validateMediaUpload(file: { type: string; size: number }) {
  const limit = MIME_LIMITS[file.type];
  if (!limit) throw new Error('Unsupported media type');
  if (file.size <= 0 || file.size > limit) throw new Error('Media size is invalid');
  return true;
}
