'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { JobListSection } from '@/components/jobs/JobListSection';
import {
  candidateAppBarGhostButtonClass,
  candidateAppBarGhostLinkClass,
} from '@/components/layout/candidate-app-bar-actions';
import { CandidateAppShell } from '@/components/layout/CandidateAppShell';
import { candidateApplyBlockedMessage, isCandidateApplyReady } from '@/lib/profile-readiness';
import { useAuthStore } from '@/stores/auth-store';
import { useJobsDashboardStore } from '@/stores/jobs-dashboard-store';

/**
 * Authenticated job browse: list open roles and apply (profile résumé + skills required by API).
 */
export function JobsDashboard() {
  const router = useRouter();

  const jobs = useJobsDashboardStore((s) => s.jobs);
  const applications = useJobsDashboardStore((s) => s.applications);
  const candidate = useJobsDashboardStore((s) => s.candidate);
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

  const applyBlockedReason = useMemo(() => {
    if (isCandidateApplyReady(candidate)) {
      return null;
    }
    return candidateApplyBlockedMessage(candidate);
  }, [candidate]);

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
    <CandidateAppShell
      title="Open roles"
      subtitle="Apply using the résumé and skills saved on your profile."
      actions={
        <>
          <Link href="/" className={candidateAppBarGhostLinkClass}>
            Home
          </Link>
          <button type="button" onClick={handleSignOut} className={candidateAppBarGhostButtonClass}>
            Sign out
          </button>
        </>
      }
    >
      {listError ? (
        <div
          className="mb-8 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          {listError}
        </div>
      ) : null}

      {applyBlockedReason ? (
        <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between">
          <p className="leading-relaxed">{applyBlockedReason}</p>
          <Link
            href="/profile"
            className="shrink-0 rounded-lg bg-amber-900 px-3 py-2 text-center text-xs font-semibold text-amber-50 hover:bg-amber-800 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300"
          >
            Go to profile
          </Link>
        </div>
      ) : null}

      <section aria-labelledby="open-jobs-heading">
        <div className="mb-6">
          <h2 id="open-jobs-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            All jobs
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            One application per role. Each submission includes your profile résumé and skills snapshot.
          </p>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span
              className="inline-block size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent dark:border-indigo-400"
              aria-hidden
            />
            Loading jobs…
          </div>
        ) : (
          <JobListSection
            jobs={jobs}
            appliedJobIds={appliedJobIds}
            applyingJobId={applyingJobId}
            getApplyError={getApplyError}
            onApply={(id) => void apply(id, { redirectToLogin })}
            applyBlockedReason={applyBlockedReason}
          />
        )}
      </section>
    </CandidateAppShell>
  );
}
