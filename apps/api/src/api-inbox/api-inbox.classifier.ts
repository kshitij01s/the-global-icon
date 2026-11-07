import { ApiInboxSeverity } from './api-inbox.enums';

const CRITICAL_HINTS = [
  'econnrefused',
  'enotfound',
  'database',
  'prisma',
  'credential',
  'unauthorized client',
  'invalid api key',
  'payment provider',
  'gateway unavailable',
  'storage root',
  'enoent',
  'eacces',
  '503',
  '502',
  'scheduler failed',
  'fatal',
];

const WARNING_HINTS = [
  'timeout',
  'etimedout',
  'econnreset',
  'temporarily',
  'retry',
  'webhook',
  'sync',
  'pdf',
  'email',
  'analytics',
  '429',
  '504',
];

export function classifySeverity(
  technicalError: string,
  category: string,
  explicit?: ApiInboxSeverity,
): ApiInboxSeverity {
  if (explicit) return explicit;
  const hay = `${category} ${technicalError}`.toLowerCase();
  if (CRITICAL_HINTS.some((h) => hay.includes(h))) return ApiInboxSeverity.CRITICAL;
  if (WARNING_HINTS.some((h) => hay.includes(h))) return ApiInboxSeverity.WARNING;
  return ApiInboxSeverity.WARNING;
}

export function defaultTitle(category: string, source: string): string {
  const map: Record<string, string> = {
    magazine_upload: 'Magazine PDF Upload Failed',
    pdf_processing: 'PDF Processing Failed',
    cover_image: 'Cover Image Upload Failed',
    file_storage: 'File Storage Operation Failed',
    magazine_publish: 'Magazine Publishing Failed',
    page_publish: 'CMS Page Publishing Failed',
    cms: 'CMS Operation Failed',
    payment: 'Payment Provider Unavailable',
    campaign: 'Advertising Campaign API Failed',
    campaign_analytics: 'Campaign Analytics Integration Failed',
    rss: 'RSS Feed Synchronization Failed',
    festival_schedule: 'Festival Theme Activation Failed',
    festival_theme: 'Festival Theme Operation Failed',
    theme_asset: 'Theme Asset Upload Failed',
    scheduler: 'Scheduled Job Failed',
    email: 'Email Delivery Failed',
    email_notification: 'Notification Email Failed',
    auth: 'Authentication Integration Failed',
    session: 'Session Infrastructure Failure',
    storage: 'Storage Failure',
    database: 'Database Connectivity Failure',
    system: 'System Operation Failed',
  };
  if (map[category]) return map[category];
  const nice = category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `${nice} Failure (${source})`;
}

export function defaultCustomerMessage(category: string): string {
  const map: Record<string, string> = {
    magazine_upload: 'We could not upload your magazine at the moment. Please try again shortly.',
    pdf_processing: 'We could not process the PDF right now. Please try again shortly.',
    cover_image: 'We could not upload the cover image. Please try again shortly.',
    file_storage: 'File storage is temporarily unavailable. Please try again shortly.',
    magazine_publish: 'The magazine could not be published. Please try again later.',
    page_publish: 'The page could not be published. Please try again later.',
    cms: 'Content could not be saved right now. Please try again shortly.',
    payment: 'Payment processing is temporarily unavailable. Please try again later.',
    campaign: 'We could not complete the advertising request. Please try again shortly.',
    rss: 'The feed service is temporarily unavailable. Please try again shortly.',
    festival_schedule: 'Theme scheduling is temporarily delayed. Please try again shortly.',
    email: 'Your request was received, but notification delivery is temporarily delayed.',
    auth: 'We are unable to complete authentication right now. Please try again shortly.',
  };
  return map[category] ?? 'We are unable to process your request right now. Please try again shortly.';
}
