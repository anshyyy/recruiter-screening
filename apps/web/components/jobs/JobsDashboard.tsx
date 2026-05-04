'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { JobListSection } from '@/components/jobs/JobListSection';
import { useAuthStore } from '@/stores/auth-store';
import { useJobsDashboardStore } from '@/stores/jobs-dashboard-store';

/**
 * Authenticated job browse: list open roles and apply. Applications are shown on `/profile`.
 */
export function JobsDashboard() {
  const router = useRouter();

  const jobs = useJobsDashboardStore((s) => s.jobs);
  const applications = useJobsDashboardStore((s) => s.applications);
  const isLoading = useJobsDashboardStore((s) => s.isLoading);
  const listError = useJobsDashboardStore((s) => s.listError);
  const applyingJobId = useJobsDashboardStore((s) => s.applyingJobId);
  const getApplyError = useJobsDashboardStore((s) => s.getApplyError);
  const refresh = useJobsDashboardStore((s) => s.refresh);
  const apply = useJobsDashboardStore((s) => s.apply);
  const resetJobsUi = useJobsDashboardStore((s) => s.reset);
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken);

  const appliedJobIds = useMemo(() => new Set(applications.map((a) => a.job.id)), [applications]);

  const redirectToLogin = useCallback(() => {
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refresh({ redirectToLogin });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refresh, redirectToLogin]);

  function handleSignOut() {
    clearAccessToken();
    resetJobsUi();
    router.replace('/login');
    router.refresh();
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/profile"
              className="shrink-0 text-sm font-semibold text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
            >
              Profile
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Open roles</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Browse and apply. View your applications on Profile.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refresh({ redirectToLogin })}
              disabled={isLoading}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Refresh
            </button>
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        {listError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
            role="alert"
          >
            {listError}
          </p>
        ) : null}

        <section aria-labelledby="open-jobs-heading">
          <div className="mb-4">
            <h2 id="open-jobs-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              All jobs
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Apply once per role; duplicates are blocked by the server.</p>
          </div>
          {isLoading ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading jobs…</p>
          ) : (
            <JobListSection
              jobs={jobs}
              appliedJobIds={appliedJobIds}
              applyingJobId={applyingJobId}
              getApplyError={getApplyError}
              onApply={(id) => void apply(id, { redirectToLogin })}
            />
          )}
        </section>
      </main>
    </div>
  );
}
