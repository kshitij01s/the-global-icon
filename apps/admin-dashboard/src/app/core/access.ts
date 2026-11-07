import { AccessRule } from './models';

/** Single source of truth for route guards and sidebar visibility (mirrors API permission keys). */
export const ACCESS = {
  dashboard: { anyPermissions: ['dashboard.view'] },
  magazines: { anyPermissions: ['magazines.read_admin'] },
  magazineCreate: { anyPermissions: ['magazines.create'] },
  magazineEdit: { anyPermissions: ['magazines.update'] },
  articles: {
    anyPermissions: [
      'articles.read_admin',
      'articles.create',
      'articles.update',
      'articles.review',
      'articles.publish',
    ],
  },
  leaders: { anyPermissions: ['leaders.manage'] },
  enquiries: { anyPermissions: ['enquiries.view', 'enquiries.manage'] },
  users: { anyPermissions: ['users.manage'] },
  settings: { anyPermissions: ['site.manage', 'site.settings_update'] },
  ads: { anyPermissions: ['ads.manage'] },
  themes: { anyPermissions: ['themes.view', 'themes.manage'] },
  pages: { anyPermissions: ['pages.view', 'pages.edit', 'pages.publish'] },
  announcements: { anyPermissions: ['site.manage'] },
  apiInbox: { anyPermissions: ['api_inbox.view', 'api_inbox.manage'] },
} satisfies Record<string, AccessRule>;
