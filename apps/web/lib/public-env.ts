/**
 * Public environment values (safe to use in the browser when prefixed with NEXT_PUBLIC_).
 */
/** Matches Nest `setGlobalPrefix('api')` and default `PORT` in `apps/api`. */
const DEFAULT_PUBLIC_API_URL = 'http://localhost:8080/api';

/**
 * Base URL for the Nest API (includes the `/api` global prefix), without a trailing slash.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const url = raw && raw.length > 0 ? raw : DEFAULT_PUBLIC_API_URL;
  return url.replace(/\/$/, '');
}
