/**
 * Builds public URLs for storage keys. Only keys are stored in the database;
 * clients receive URLs, never filesystem paths.
 */
export const API_PREFIX = 'api';

export function publicMediaUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  const encoded = key
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/${API_PREFIX}/media/public/${encoded}`;
}

export function magazinePdfUrl(slug: string): string {
  return `/${API_PREFIX}/magazines/${encodeURIComponent(slug)}/pdf`;
}
