import type { RoleName } from '@prisma/client';

/** Core permission keys. Seeded into the `Permission` table. */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  MAGAZINES_READ_ADMIN: 'magazines.read_admin',
  MAGAZINES_CREATE: 'magazines.create',
  MAGAZINES_UPDATE: 'magazines.update',
  MAGAZINES_DELETE: 'magazines.delete',
  MAGAZINES_REVIEW: 'magazines.review',
  MAGAZINES_PUBLISH: 'magazines.publish',
  ARTICLES_READ_ADMIN: 'articles.read_admin',
  ARTICLES_CREATE: 'articles.create',
  ARTICLES_UPDATE: 'articles.update',
  ARTICLES_DELETE: 'articles.delete',
  ARTICLES_REVIEW: 'articles.review',
  ARTICLES_PUBLISH: 'articles.publish',
  LEADERS_MANAGE: 'leaders.manage',
  ENQUIRIES_VIEW: 'enquiries.view',
  ENQUIRIES_MANAGE: 'enquiries.manage',
  ADS_MANAGE: 'ads.manage',
  SITE_MANAGE: 'site.manage',
  SITE_SETTINGS_UPDATE: 'site.settings_update',
  THEMES_VIEW: 'themes.view',
  THEMES_MANAGE: 'themes.manage',
  THEMES_SCHEDULE: 'themes.schedule',
  PAGES_VIEW: 'pages.view',
  PAGES_EDIT: 'pages.edit',
  PAGES_PUBLISH: 'pages.publish',
  USERS_MANAGE: 'users.manage',
  USERS_MANAGE_ADMINS: 'users.manage_admins',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  'dashboard.view': 'View the admin dashboard',
  'magazines.read_admin': 'List and view all magazines (including drafts)',
  'magazines.create': 'Create magazine records',
  'magazines.update': 'Edit magazine records',
  'magazines.delete': 'Delete magazine records',
  'magazines.review': 'Review magazine submissions',
  'magazines.publish': 'Publish or unpublish magazines',
  'articles.read_admin': 'List and view all articles (including drafts)',
  'articles.create': 'Create articles',
  'articles.update': 'Edit articles',
  'articles.delete': 'Delete articles',
  'articles.review': 'Review articles',
  'articles.publish': 'Publish articles',
  'leaders.manage': 'Manage featured leaders',
  'enquiries.view': 'View client enquiries',
  'enquiries.manage': 'Manage client enquiries',
  'ads.manage': 'Manage advertisements',
  'site.manage': 'View site settings and manage homepage',
  'site.settings_update': 'Change global site settings (Super Admin only)',
  'themes.view': 'View theme library and active appearance',
  'themes.manage': 'Change global themes and festival settings (Super Admin by default)',
  'themes.schedule': 'Create and edit festival theme schedules',
  'pages.view': 'View managed website pages',
  'pages.edit': 'Edit managed website page drafts',
  'pages.publish': 'Publish managed website pages',
  'users.manage': 'Manage reader and staff accounts',
  'users.manage_admins': 'Grant or revoke administrator roles',
  'audit.view': 'View audit logs',
};

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Full platform control, including administrator management',
  ADMIN: 'Administrative access to content, enquiries and settings',
  EDITOR: 'Creates and edits editorial content',
  REVIEWER: 'Reviews submitted content',
  PUBLISHER: 'Publishes approved content',
  AD_MANAGER: 'Manages advertising placements',
  ENQUIRY_MANAGER: 'Handles client enquiries',
  READER: 'Registered reader (default for public registration)',
  SUBSCRIBER: 'Reader with member access',
};

const P = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter(
    (key) =>
      key !== P.USERS_MANAGE_ADMINS &&
      key !== P.SITE_SETTINGS_UPDATE &&
      key !== P.THEMES_MANAGE &&
      key !== P.THEMES_SCHEDULE &&
      key !== P.PAGES_PUBLISH,
  ),
  EDITOR: [
    P.DASHBOARD_VIEW,
    P.MAGAZINES_READ_ADMIN,
    P.MAGAZINES_CREATE,
    P.MAGAZINES_UPDATE,
    P.ARTICLES_READ_ADMIN,
    P.ARTICLES_CREATE,
    P.ARTICLES_UPDATE,
    P.LEADERS_MANAGE,
    P.PAGES_VIEW,
    P.PAGES_EDIT,
  ],
  REVIEWER: [
    P.DASHBOARD_VIEW,
    P.MAGAZINES_READ_ADMIN,
    P.MAGAZINES_REVIEW,
    P.ARTICLES_READ_ADMIN,
    P.ARTICLES_REVIEW,
  ],
  PUBLISHER: [
    P.DASHBOARD_VIEW,
    P.MAGAZINES_READ_ADMIN,
    P.MAGAZINES_PUBLISH,
    P.ARTICLES_READ_ADMIN,
    P.ARTICLES_PUBLISH,
  ],
  AD_MANAGER: [P.DASHBOARD_VIEW, P.ADS_MANAGE],
  ENQUIRY_MANAGER: [P.DASHBOARD_VIEW, P.ENQUIRIES_VIEW, P.ENQUIRIES_MANAGE],
  READER: [],
  SUBSCRIBER: [],
};

/** Roles that must never be assignable through public registration. */
export const STAFF_ROLES: RoleName[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'EDITOR',
  'REVIEWER',
  'PUBLISHER',
  'AD_MANAGER',
  'ENQUIRY_MANAGER',
];
