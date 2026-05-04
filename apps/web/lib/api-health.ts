import { getPublicApiBaseUrl } from './public-env';

export type ApiHealthResult =
  | { ok: true; status: string }
  | { ok: false; error: string };

/**
 * Server-side check against the API `/health` route (no secrets; uses public base URL).
 */
export async function fetchApiHealth(): Promise<ApiHealthResult> {
  const base = getPublicApiBaseUrl();
  try {
    const res = await fetch(`${base}/health`, { cache: 'no-store' });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const body = (await res.json()) as {
      success?: boolean;
      data?: { status?: string };
    };
    if (body.success === true && body.data && typeof body.data.status === 'string') {
      return { ok: true, status: body.data.status };
    }
    return { ok: false, error: 'Unexpected health response shape' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    return { ok: false, error: message };
  }
}
