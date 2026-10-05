import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { EffectiveAuthorizationContext, PermissionKey, RoleKey } from '@/core/authorisation';

export async function hasPermission(permission: PermissionKey, organizationId?: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { data, error } = await supabase.rpc('authorize', {
    permission_key: permission,
    organization_id: organizationId ?? null,
  });
  return !error && data === true;
}

export async function hasRole(role: RoleKey, organizationId?: string) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;
  const { data, error } = await supabase.rpc('has_role', {
    role_key: role,
    organization_id: organizationId ?? null,
  });
  return !error && data === true;
}

export async function hasAnyRole(roles: RoleKey[], organizationId?: string) {
  for (const role of roles) {
    if (await hasRole(role, organizationId)) return true;
  }
  return false;
}

export async function getAuthorizationContext(): Promise<EffectiveAuthorizationContext | null> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;
  const { data, error } = await supabase.rpc('authorization_context');
  if (error || !data) return null;
  return data as EffectiveAuthorizationContext;
}

export async function authorize(permission: PermissionKey, organizationId?: string) {
  const allowed = await hasPermission(permission, organizationId);
  if (!allowed) {
    throw new Error('FORBIDDEN');
  }
  return true;
}
