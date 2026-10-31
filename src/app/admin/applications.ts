export type AdminApplication = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'partial' | 'boundary' | 'planned';
  entryPath: string | null;
  requiredPermissions: string[];
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
    description: 'Current service catalog and request operations; full workflow remains partial.',
    status: 'partial',
    entryPath: '/admin/services',
    requiredPermissions: [],
  },
  {
    id: 'academy',
    name: 'Academy',
    description: 'Academy administration: course authoring, modules, lessons, assessments, admission and certificates; publication workflow pending end-to-end acceptance.',
    status: 'partial',
    entryPath: '/admin/academy',
    requiredPermissions: [],
  },
  {
    id: 'talent',
    name: 'Talent',
    description: 'Existing professional profile and evidence review workspace; full workflow requires acceptance testing.',
    status: 'partial',
    entryPath: '/admin/talent',
    requiredPermissions: [],
  },
  {
    id: 'partners',
    name: 'Partners',
    description: 'Existing partner applications and identity document review; full workflow requires acceptance testing.',
    status: 'partial',
    entryPath: '/admin/partners',
    requiredPermissions: [],
  },
  {
    id: 'support-notifications',
    name: 'Support & Notifications',
    description: 'Current messaging/content surfaces exist; unified tickets and notifications are not implemented.',
    status: 'boundary',
    entryPath: null,
    requiredPermissions: [],
  },
  {
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
  {
    id: 'encyclopedias',
    name: 'Encyclopedias',
    description: 'Future scientific, technology and programming encyclopedia applications.',
    status: 'planned',
    entryPath: null,
    requiredPermissions: [],
  },
];
