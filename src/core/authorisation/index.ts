export * from './types';

export type PermissionKey = string;
export type RoleKey = string;

export interface EffectiveAuthorizationContext {
  userId: string;
  globalRoles: RoleKey[];
  permissions: PermissionKey[];
  organizations: Array<{
    organizationId: string;
    role: RoleKey;
    status: 'active' | 'pending' | 'suspended' | 'removed';
  }>;
}
