import { createClient } from '@/lib/supabase/server';
import { isUnifiedUploadService, validateUnifiedUploadSize } from './capability';

export type UploadAuthorizationInput = {
  service: unknown;
  resourceId: unknown;
  fileName: unknown;
  sizeBytes: unknown;
};

/** Fail closed for all services until their resource-specific permission checks exist. */
export async function authorizeUpload(input: UploadAuthorizationInput) {
  if (!isUnifiedUploadService(input.service) ||
      typeof input.resourceId !== 'string' ||
      typeof input.fileName !== 'string' ||
      input.fileName.length < 1 || input.fileName.length > 255 ||
      /[/\\\x00-\x1f]/.test(input.fileName) ||
      typeof input.sizeBytes !== 'number' ||
      !validateUnifiedUploadSize(input.sizeBytes)) {
    return { ok: false as const, status: 400, error: 'Invalid upload metadata' };
  }
  const db = await createClient();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: 'Authentication required' };
  if (input.service !== 'academy') {
    return { ok: false as const, status: 503, error: 'Service authorization adapter not enabled' };
  }
  const { data: lesson, error: lessonError } = await db.from('academy_lessons')
    .select('id,academy_modules!inner(course_id)').eq('id', input.resourceId).maybeSingle();
  if (lessonError || !lesson) return { ok: false as const, status: 404, error: 'Lesson not found' };
  const courseId = (lesson.academy_modules as unknown as { course_id: string }).course_id;
  const { data: allowed, error: accessError } = await db.rpc('can_manage_academy_course', { p_course_id: courseId });
  if (accessError || allowed !== true) return { ok: false as const, status: 403, error: 'Access denied' };
  return { ok: true as const, userId: user.id, courseId, lessonId: input.resourceId, service: input.service, sizeBytes: input.sizeBytes, fileName: input.fileName };
}
