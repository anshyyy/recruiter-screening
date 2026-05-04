'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AdminAppShell } from '@/components/admin/AdminAppShell';
import { AdminApplicationDetailDialog } from '@/components/admin/AdminApplicationDetailDialog';
import { AdminApplicantsTable } from '@/components/admin/AdminApplicantsTable';
import { AdminJobListPanel } from '@/components/admin/AdminJobListPanel';
import {
  fetchAdminApplicationsForJob,
  fetchAdminJobs,
} from '@/lib/admin-api';
import type { AdminApplicationListItem, AdminJobListItem } from '@/lib/admin-types';
import { fetchAuthMe } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';

const ghostButtonClass =
  'rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800';

/**
 * Authenticated admin home: pick a job, review applicants, open screening detail (summary + transcript).
 */
export function AdminDashboard() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken);

  const [authChecked, setAuthChecked] = useState(false);
  const [jobs, setJobs] = useState<AdminJobListItem[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<AdminApplicationListItem[]>([]);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!accessToken) {
      redirectToLogin();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchAuthMe(accessToken);
        if (cancelled) {
          return;
        }
        if (me.role !== 'admin') {
          redirectToLogin();
          return;
        }
        setAuthChecked(true);
      } catch {
        if (!cancelled) {
          redirectToLogin();
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, redirectToLogin]);

  useEffect(() => {
    if (!authChecked || !accessToken) {
      return;
    }
    let cancelled = false;
    setJobsLoading(true);
    setJobsError(null);
    void (async () => {
      try {
        const list = await fetchAdminJobs(accessToken);
        if (cancelled) {
          return;
        }
        setJobs(list);
        setSelectedJobId((prev) => {
          if (prev && list.some((j) => j.id === prev)) {
            return prev;
          }
          return list[0]?.id ?? null;
        });
      } catch (e) {
        if (!cancelled) {
          setJobsError(e instanceof Error ? e.message : 'Failed to load jobs');
        }
      } finally {
        if (!cancelled) {
          setJobsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, accessToken]);

  useEffect(() => {
    if (!authChecked || !accessToken || !selectedJobId) {
      setApplications([]);
      return;
    }
    let cancelled = false;
    setApplicationsLoading(true);
    setApplicationsError(null);
    void (async () => {
      try {
        const list = await fetchAdminApplicationsForJob(accessToken, selectedJobId);
        if (!cancelled) {
          setApplications(list);
        }
      } catch (e) {
        if (!cancelled) {
          setApplicationsError(e instanceof Error ? e.message : 'Failed to load applications');
          setApplications([]);
        }
      } finally {
        if (!cancelled) {
          setApplicationsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, accessToken, selectedJobId]);

  function handleSignOut() {
    clearAccessToken();
    router.replace('/login');
    router.refresh();
  }

  if (!accessToken) {
    return null;
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="inline-block size-5 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
            aria-hidden
          />
          Checking access…
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminAppShell
        title="Applications"
        subtitle="Select a job to see candidates, pipeline stage, and AI screening results. Open a row for the full transcript and summary."
        actions={
          <>
            <Link href="/" className={ghostButtonClass}>
              Home
            </Link>
            <button type="button" onClick={handleSignOut} className={ghostButtonClass}>
              Sign out
            </button>
          </>
        }
      >
        {jobsError ? (
          <div
            className="mb-6 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
            role="alert"
          >
            {jobsError}
          </div>
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Jobs</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Choose a role to load applicants.</p>
            <div className="mt-4">
              {jobsLoading ? (
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <span
                    className="inline-block size-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
                    aria-hidden
                  />
                  Loading jobs…
                </div>
              ) : (
                <AdminJobListPanel
                  jobs={jobs}
                  selectedJobId={selectedJobId}
                  onSelectJob={setSelectedJobId}
                />
              )}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Applicants</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Screening score appears after the voice interview completes.
            </p>
            {applicationsError ? (
              <div
                className="mt-4 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
                role="alert"
              >
                {applicationsError}
              </div>
            ) : null}
            <div className="mt-4">
              {applicationsLoading ? (
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <span
                    className="inline-block size-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
                    aria-hidden
                  />
                  Loading applicants…
                </div>
              ) : (
                <AdminApplicantsTable rows={applications} onInspect={setDetailApplicationId} />
              )}
            </div>
          </div>
        </div>
      </AdminAppShell>

      <AdminApplicationDetailDialog
        open={detailApplicationId !== null}
        applicationId={detailApplicationId}
        accessToken={accessToken}
        onClose={() => setDetailApplicationId(null)}
      />
    </>
  );
}
