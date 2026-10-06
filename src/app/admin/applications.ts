export type AdminApplication = {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'boundary' | 'planned';
  requiredPermissions: string[];
};

export const ADMIN_APPLICATIONS: AdminApplication[] = [
  {
    id: 'core-admin',
    name: 'Core Administration',
    description: 'Users, roles, permissions, organizations and system controls.',
    status: 'active',
    requiredPermissions: ['users.read', 'settings.read'],
  },
  {
    id: 'commerce',
    name: 'Commerce',
    description: 'Current products, categories and market leads.',
    status: 'active',
    requiredPermissions: ['users.read'],
  },
  {
    id: 'community',
    name: 'Community & Content',
    description: 'Posts, contributions, moderation and messaging foundation.',
    status: 'active',
    requiredPermissions: ['posts.read', 'contributions.read', 'messages.read'],
  },
  {
    id: 'services',
    name: 'Services',
    description: 'Reserved application boundary for the future service workflow.',
    status: 'boundary',
    requiredPermissions: [],
  },
  {
    id: 'academy',
    name: 'Academy',
    description: 'Reserved application boundary for the future LMS.',
    status: 'boundary',
    requiredPermissions: [],
  },
  {
    id: 'encyclopedias',
    name: 'Encyclopedias',
    description: 'Future registry area for scientific, technology and programming encyclopedias.',
    status: 'planned',
    requiredPermissions: [],
  },
];
