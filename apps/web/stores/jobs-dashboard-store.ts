'use client';

import { create } from 'zustand';
import type { AuthUser } from '@/lib/auth-api';
import { fetchAuthMe } from '@/lib/auth-api';
import { applyToJob, fetchMyJobApplications, fetchOpenJobs } from '@/lib/jobs-api';
import type { AppliedJobDto, JobDto } from '@/lib/jobs-types';
import { useAuthStore } from '@/stores/auth-store';

function normalizeCandidate(me: AuthUser): AuthUser {
  return {
    ...me,
    skills: Array.isArray(me.skills) ? me.skills : [],
    resumeObjectKey: me.resumeObjectKey ?? null,
    resumeFileName: me.resumeFileName ?? null,
  };
}

/** Navigation is kept in the UI layer; the store calls this when the session is missing. */
export type JobsDashboardAuthContext = {
  redirectToLogin: () => void;
};

type JobsDashboardStore = {
  jobs: JobDto[];
  applications: AppliedJobDto[];
  /** Latest `/auth/me` payload for apply gating and UI hints. */
  candidate: AuthUser | null;
  isLoading: boolean;
  listError: string | null;
  applyingJobId: string | null;
  applyErrors: Record<string, string>;
  getApplyError: (jobId: string) => string | undefined;
  refresh: (ctx: JobsDashboardAuthContext) => Promise<void>;
  apply: (jobId: string, ctx: JobsDashboardAuthContext) => Promise<void>;
  /** Clears job UI state after sign-out. */
  reset: () => void;
  /** Sync candidate after profile updates without a full jobs refresh. */
  setCandidate: (user: AuthUser | null) => void;
};

const emptyState = {
  jobs: [] as JobDto[],
  applications: [] as AppliedJobDto[],
  candidate: null as AuthUser | null,
  isLoading: true,
  listError: null as string | null,
  applyingJobId: null as string | null,
  applyErrors: {} as Record<string, string>,
};

/**
 * Jobs list, applications, and mutations. Auth token comes from `useAuthStore`.
 */
export const useJobsDashboardStore = create<JobsDashboardStore>((set, get) => ({
  ...emptyState,
  getApplyError: (jobId) => get().applyErrors[jobId],
  reset: () => set({ ...emptyState, isLoading: false }),
  setCandidate: (user) => set({ candidate: user ? normalizeCandidate(user) : null }),
  refresh: async (ctx) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      set({ isLoading: false });
      ctx.redirectToLogin();
      return;
    }
    set({ listError: null, isLoading: true });
    try {
      const [jobList, mine, me] = await Promise.all([
        fetchOpenJobs(),
        fetchMyJobApplications(token),
        fetchAuthMe(token),
      ]);
      set({ jobs: jobList, applications: mine, candidate: normalizeCandidate(me) });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load jobs';
      set({ listError: message });
    } finally {
      set({ isLoading: false });
    }
  },
  apply: async (jobId, ctx) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) {
      ctx.redirectToLogin();
      return;
    }
    set((s) => {
      const nextErrors = { ...s.applyErrors };
      delete nextErrors[jobId];
      return { applyingJobId: jobId, applyErrors: nextErrors };
    });
    try {
      const created = await applyToJob(token, jobId);
      set((s) => ({
        applications: [created, ...s.applications.filter((a) => a.applicationId !== created.applicationId)],
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apply failed';
      set((s) => ({ applyErrors: { ...s.applyErrors, [jobId]: message } }));
    } finally {
      set({ applyingJobId: null });
    }
  },
}));
