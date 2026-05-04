import type { ApiHealthResult } from '@/lib/api-health';

type ApiStatusBannerProps = {
  result: ApiHealthResult;
};

/**
 * Shows whether the configured API `/health` check succeeded (UI only; pass data from a Server Component).
 */
export function ApiStatusBanner({ result }: ApiStatusBannerProps) {
  if (result.ok) {
    return (
      <p className="w-full rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        API health: <span className="font-mono">{result.status}</span>
      </p>
    );
  }

  return (
    <p className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      API unreachable: {result.error}. Ensure <code className="font-mono">pnpm dev</code> is running
      and <code className="font-mono">NEXT_PUBLIC_API_URL</code> matches the Nest port (default{' '}
      <code className="font-mono">3001</code>).
    </p>
  );
}
