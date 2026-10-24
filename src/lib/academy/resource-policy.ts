import mimeTypes from './mime-types.json';

/** ASLAN-ACADEMY-UNIFIED-004: permitted learning resource types.
 * Acceptance is distinct from browser preview and media transcoding.
 * MIME values and extensions are only hints: validate signatures server-side,
 * scan archives, and never execute uploaded scripts or binaries.
 */
export const ACADEMY_FILE_CATEGORIES = {
 video: ['mp4','webm','mov','m4v','mkv','avi'],
 audio: ['mp3','wav','m4a','aac','ogg','flac'],
 document: ['pdf','doc','docx','txt','rtf','odt'],
 presentation: ['ppt','pptx','odp'],
 spreadsheet: ['xls','xlsx','csv','ods'],
 image: ['jpg','jpeg','png','webp','gif','svg'],
 data: ['json','xml'],
 interactive: ['html','css','js'],
 archive: ['zip'],
} as const;

export const ACADEMY_MAX_FILE_BYTES = 8 * 1024 ** 3;
export const ACADEMY_UPLOAD_PROTOCOL = 'tus-resumable' as const;
export const ACADEMY_MIME_TYPES: Readonly<Record<string, string>> = mimeTypes;

const extensionSet = new Set<string>(Object.values(ACADEMY_FILE_CATEGORIES).flat());
const blocked = new Set(['exe','apk','bat','cmd','com','dll','msi','sh','ps1','jar','scr']);

export type UploadPreflight = { accepted: boolean; reason?: string; extension?: string };
export function validateAcademyUploadMetadata(
  filename: string,
  sizeBytes: number,
): UploadPreflight {
  if (typeof filename !== 'string' || filename.length < 1 || filename.length > 180 ||
      /[/\\\x00-\x1f]/.test(filename)) {
    return { accepted: false, reason: 'invalid_filename' };
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0 || sizeBytes > ACADEMY_MAX_FILE_BYTES) {
    return { accepted: false, reason: 'invalid_size' };
  }
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!extension || blocked.has(extension) || !extensionSet.has(extension)) {
    return { accepted: false, reason: 'unsupported_extension' };
  }
  return { accepted: true, extension };
}

export type ResourceDelivery = 'browser' | 'transcode' | 'download' | 'sandbox';
export function preferredResourceDelivery(extension: string): ResourceDelivery {
  const ext = extension.toLowerCase();
  if (['mp4','webm','mp3','wav','m4a','ogg','pdf','txt','jpg','jpeg','png','webp','gif'].includes(ext)) return 'browser';
  if (['mov','m4v','mkv','avi','flac','aac'].includes(ext)) return 'transcode';
  if (['html','css','js','svg'].includes(ext)) return 'sandbox';
  return 'download';
}
