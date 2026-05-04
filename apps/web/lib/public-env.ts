/**
 * Public environment values (safe to use in the browser when prefixed with NEXT_PUBLIC_).
 */
const DEFAULT_PUBLIC_API_URL = 'http://localhost:3001';

/**
 * Base URL for the Nest API, without a trailing slash.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  const url = raw && raw.length > 0 ? raw : DEFAULT_PUBLIC_API_URL;
  return url.replace(/\/$/, '');
}
