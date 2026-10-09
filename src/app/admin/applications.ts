export type AdminApplication = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'partial' | 'boundary' | 'planned';
  entryPath: string | null;
  requiredPermissions: string[  {
    id: 'users',
    name: 'Users Directory',
    description: 'Real profile, assigned-role and organization-membership directory.',
    status: 'active',
    entryPath: '/admin/users',
    requiredPermissions: ['users.read'],
  },
  {
    id: 'organizations',
    name: 'Organizations',
    description: 'Existing organization and membership management.',
    status: 'partial',
    entryPath: '/admin/organizations',
    requiredPermissions: ['organizations.read'],
  },
  {
    id: 'reports',
    name: 'Operational Reports',
    description: 'Live counts from current database tables; failed queries are not represented as zero.',
    status: 'active',
    entryPath: '/admin/reports',
    requiredPermissions: ['users.read'],
  },
  {
    id: 'settings',
    name: 'Settings Index',
    description: 'Links to existing payment/access settings; generic settings persistence is not implemented.',
    status: 'partial',
    entryPath: '/admin/settings',
    requiredPermissions: ['settings.read'],
  },
  {
    id: 'extensions',
    name: 'Applications & Extensions',
    description: 'Repository-defined registry; no dynamic or untrusted plugin execution.',
    status: 'active',
    entryPath: '/admin/applications',
    requiredPermissions: ['settings.read'],
  },
];
};

export const ADMIN_APPLICATIONS: AdminApplication[] = [
  {
    id: 'core-admin',
    name: 'Core Administration',
    description: 'Users, roles, permissions, organizations and system controls.',
    status: 'partial',
    entryPath: '/admin/access',
    requiredPermissions: ['users.read', 'settings.read'],
  },
  {
    id: 'commerce',
    name: 'Commerce',
    description: 'Current products, categories and market leads.',
    status: 'partial',
    entryPath: '/admin/market',
    requiredPermissions: ['users.read'],
  },
  {
    id: 'community',
    name: 'Community & Content',
    description: 'Posts, contributions, moderation and messaging foundation.',
    status: 'partial',
    entryPath: '/admin/content',
    requiredPermissions: ['posts.read', 'contributions.read', 'messages.read'],
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Reserved application boundary for the future service workflow.',
    status: 'partial',
    entryPath: '/admin/services',
    requiredPermissions: [],
  },
  {
    id: 'academy',
    name: 'Academy',
    description: 'Reserved application boundary for the future LMS.',
    status: 'boundary',
    entryPath: null,
    requiredPermissions: [],
  },
  {
    id: 'encyclopedias',
    name: 'Encyclopedias',
    description: 'Future registry area for scientific, technology and programming encyclopedias.',
    status: 'planned',
    entryPath: null,
    requiredPermissions: [],
  },
];
