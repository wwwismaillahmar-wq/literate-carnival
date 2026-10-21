import { createClient } from '@/lib/supabase/server';
import { isUnifiedUploadService, validateUnifiedUploadSize } from './capability';

export type UploadAuthorizationInput = {
  service: unknown;
  resourceId: unknown;
  fileName: unknown;
  sizeBytes: unknown;
};

/**
 * Shared Supabase-backed resource authorization for the staged TUS gateway.
 * This checks ownership/roles, but DOES NOT enable live transfers. The gateway
 * must still enforce single-use grants, authenticated hooks and finalization.
 */
export async function authorizeUpload(input: UploadAuthorizationInput) {
  if (!isUnifiedUploadService(input.service) ||
      typeof input.resourceId !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.resourceId) ||
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

  const denied = { ok: false as const, status: 403, error: 'Access denied' };
  const unavailable = { ok: false as const, status: 503, error: 'Authorization could not be verified' };
  const allowed = () => ({ ok: true as const, userId: user.id, resourceId: input.resourceId as string,
    service: input.service, sizeBytes: input.sizeBytes as number, fileName: input.fileName as string });

  if (input.service === 'academy') {
    const { data: lesson, error: lessonError } = await db.from('academy_lessons')
      .select('id,academy_modules!inner(course_id)').eq('id', input.resourceId).maybeSingle();
    if (lessonError) return unavailable;
    if (!lesson) return denied;
    const courseId = (lesson.academy_modules as unknown as { course_id: string }).course_id;
    const { data: canManage, error: accessError } = await db.rpc('can_manage_academy_course', { p_course_id: courseId });
    if (accessError) return unavailable;
    return canManage === true ? { ...allowed(), courseId, lessonId: input.resourceId } : denied;
  }

  if (input.service === 'market') {
    // Only the owner of the store may upload against that store.
    const { data, error: lookupError } = await db.from('market_stores')
      .select('owner_id').eq('id', input.resourceId).maybeSingle();
    if (lookupError) return unavailable;
    return data?.owner_id === user.id ? allowed() : denied;
  }

  if (input.service === 'community') {
    const { data, error: lookupError } = await db.from('posts')
      .select('author_id').eq('id', input.resourceId).maybeSingle();
    if (lookupError) return unavailable;
    return data?.author_id === user.id ? allowed() : denied;
  }

  if (input.service === 'messages') {
    // Conversation participants may attach files; non-participants cannot.
    const { data, error: lookupError } = await db.from('conversations')
      .select('participant_a,participant_b').eq('id', input.resourceId).maybeSingle();
    if (lookupError) return unavailable;
    return data && (data.participant_a === user.id || data.participant_b === user.id) ? allowed() : denied;
  }

  if (input.service === 'services') {
    const { data, error: lookupError } = await db.from('service_requests')
      .select('customer_id').eq('id', input.resourceId).maybeSingle();
    if (lookupError) return unavailable;
    return data?.customer_id === user.id ? allowed() : denied;
  }

  if (input.service === 'partners') {
    const { data, error: lookupError } = await db.from('partner_applications')
      .select('owner_id').eq('id', input.resourceId).maybeSingle();
    if (lookupError) return unavailable;
    return data?.owner_id === user.id ? allowed() : denied;
  }

  if (input.service === 'admin') {
    // Admin content is privileged; require a verified admin role AND existing content.
    const { data: assignments, error: rolesError } = await db.from('user_roles')
      .select('roles!inner(key)').eq('user_id', user.id);
    if (rolesError) return unavailable;
    const isAdmin = (assignments ?? []).some(item => {
      const role = item.roles as unknown as { key: string } | null;
      return role?.key === 'admin' || role?.key === 'super_admin';
    });
    if (!isAdmin) return denied;
    const { data, error: contentError } = await db.from('company_content')
      .select('id').eq('id', input.resourceId).maybeSingle();
    if (contentError) return unavailable;
    return data ? allowed() : denied;
  }

  return denied;
}
