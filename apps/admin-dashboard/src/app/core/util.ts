import { HttpErrorResponse, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

/** Extracts a readable message from a Nest error response. */
export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return `Cannot reach the API at ${environment.apiUrl}. Is it running, and is this origin in CORS_ORIGINS?`;
    }
    const body = err.error as { message?: string | string[] } | null;
    const msg = body?.message;
    if (Array.isArray(msg)) return msg.join(' · ');
    if (typeof msg === 'string' && msg) return msg;
    if (err.status === 403) return 'You do not have permission to do that.';
    if (err.status === 429) return 'Too many requests. Please wait a moment and try again.';
    return `Request failed (${err.status}).`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong.';
}

export function toParams(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

const apiOrigin = new URL(environment.apiUrl).origin;

/** API returns media as site-relative paths (/api/media/public/...). Make them absolute. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//i.test(path) ? path : `${apiOrigin}${path}`;
}

export function humanize(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
