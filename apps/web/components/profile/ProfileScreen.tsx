'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useState } from 'react';
import { AppliedJobsSection } from '@/components/jobs/AppliedJobsSection';
import {
  candidateAppBarGhostButtonClass,
  candidateAppBarGhostLinkClass,
} from '@/components/layout/candidate-app-bar-actions';
import { CandidateAppShell } from '@/components/layout/CandidateAppShell';
import { ProfilePhoneCard } from '@/components/profile/ProfilePhoneCard';
import { ProfileResumeCard } from '@/components/profile/ProfileResumeCard';
import { ProfileSkillsEditor } from '@/components/profile/ProfileSkillsEditor';
import { UnderlineTabs, type UnderlineTabItem } from '@/components/ui/UnderlineTabs';
import type { AuthUser } from '@/lib/auth-api';
import { fetchAuthMe, patchAuthProfile } from '@/lib/auth-api';
import type { AppliedJobDto } from '@/lib/jobs-types';
import { fetchMyJobApplications } from '@/lib/jobs-api';
import { isCandidateApplyReady } from '@/lib/profile-readiness';
import { useAuthStore } from '@/stores/auth-store';
import { useJobsDashboardStore } from '@/stores/jobs-dashboard-store';

type ProfileTabId = 'details' | 'applications';

const PROFILE_TABS: readonly UnderlineTabItem<ProfileTabId>[] = [
  { id: 'details', label: 'Account & profile' },
  { id: 'applications', label: 'Applied jobs' },
];

/**
 * Account, candidate profile (skills + résumé), and applications — loaded from the API.
 */
export function ProfileScreen() {
  const router = useRouter();
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken);
  const resetJobsUi = useJobsDashboardStore((s) => s.reset);
  const setDashboardCandidate = useJobsDashboardStore((s) => s.setCandidate);

  const [user, setUser] = useState<AuthUser | null>(null);
  const [applications, setApplications] = useState<AppliedJobDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTabId>('details');
  const profileTabsIdPrefix = useId();

  const redirectToLogin = useCallback(() => {
    router.replace('/login');
  }, [router]);

  const syncCandidateToJobsStore = useCallback(
    (next: AuthUser) => {
      setDashboardCandidate(next);
    },
    [setDashboardCandidate],
  );

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      const token = useAuthStore.getState().accessToken;
      if (!token) {
        redirectToLogin();
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      void (async () => {
        try {
          const [me, mine] = await Promise.all([fetchAuthMe(token), fetchMyJobApplications(token)]);
          if (!cancelled) {
            setUser(me);
            setApplications(mine);
            syncCandidateToJobsStore(me);
          }
        } catch (err) {
          if (!cancelled) {
            setLoadError(err instanceof Error ? err.message : 'Could not load profile');
          }
        } finally {
          if (!cancelled) {
            setIsLoading(false);
          }
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [redirectToLogin, syncCandidateToJobsStore]);

  function handleSignOut() {
    clearAccessToken();
    resetJobsUi();
    router.replace('/login');
    router.refresh();
  }

  const token = useAuthStore((s) => s.accessToken);
  const applyReady = isCandidateApplyReady(user ?? undefined);

  return (
    <CandidateAppShell
      title="Profile"
      subtitle="Résumé and skills are attached to every job application."
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
      {loadError ? (
        <div
          className="mb-8 rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 shadow-sm dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100"
          role="alert"
        >
          {loadError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="inline-block size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent dark:border-indigo-400"
            aria-hidden
          />
          Loading profile…
        </div>
      ) : user && token ? (
        <div className="flex flex-col gap-6">
          {!applyReady ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100">
              <strong className="font-semibold">Complete your profile to apply.</strong> Add at least one skill, upload a PDF résumé, and add a
              phone number for the AI screening call.
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              You are ready to apply — résumé, skills, and phone number are on file.
            </div>
          )}

          <UnderlineTabs
            idPrefix={profileTabsIdPrefix}
            tabs={PROFILE_TABS}
            value={activeTab}
            onChange={setActiveTab}
            ariaLabel="Profile sections"
          />

          <div
            role="tabpanel"
            id={`${profileTabsIdPrefix}-panel-details`}
            aria-labelledby={`${profileTabsIdPrefix}-tab-details`}
            hidden={activeTab !== 'details'}
            tabIndex={0}
            className={activeTab === 'details' ? 'mt-2 flex flex-col gap-8 outline-none' : undefined}
          >
            {activeTab === 'details' ? (
              <>
                <section
                  className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
                  aria-labelledby="account-heading"
                >
                  <h2 id="account-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Account
                  </h2>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Email</dt>
                      <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.email}</dd>
                    </div>
                    {user.fullName ? (
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Name</dt>
                        <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.fullName}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Role</dt>
                      <dd className="mt-1 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">{user.role ?? 'user'}</dd>
                    </div>
                  </dl>
                </section>

                <section
                  className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
                  aria-labelledby="skills-heading"
                >
                  <h2 id="skills-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Skills
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">These tags are stored on your profile and snapshotted when you apply.</p>
                  <div className="mt-5">
                    <ProfileSkillsEditor
                      key={(Array.isArray(user.skills) ? user.skills : []).join('|')}
                      initialSkills={Array.isArray(user.skills) ? user.skills : []}
                      onSave={async (skills) => {
                        const updated = await patchAuthProfile(token, { skills });
                        setUser(updated);
                        syncCandidateToJobsStore(updated);
                      }}
                    />
                  </div>
                </section>

                <section
                  className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
                  aria-labelledby="phone-heading"
                >
                  <h2 id="phone-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Phone for AI screening
                  </h2>
                  <div className="mt-5">
                    <ProfilePhoneCard
                      accessToken={token}
                      user={user}
                      onProfileUpdated={(next) => {
                        setUser(next);
                        syncCandidateToJobsStore(next);
                      }}
                    />
                  </div>
                </section>

                <section
                  className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
                  aria-labelledby="resume-heading"
                >
                  <h2 id="resume-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Résumé
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    PDF only. If uploads are not configured on the server, you will see an error — set S3 env vars in the API.
                  </p>
                  <div className="mt-5">
                    <ProfileResumeCard
                      accessToken={token}
                      user={user}
                      onProfileUpdated={(next) => {
                        setUser(next);
                        syncCandidateToJobsStore(next);
                      }}
                    />
                  </div>
                </section>
              </>
            ) : null}
          </div>

          <div
            role="tabpanel"
            id={`${profileTabsIdPrefix}-panel-applications`}
            aria-labelledby={`${profileTabsIdPrefix}-tab-applications`}
            hidden={activeTab !== 'applications'}
            tabIndex={0}
            className={activeTab === 'applications' ? 'mt-2 outline-none' : undefined}
          >
            {activeTab === 'applications' ? (
              <AppliedJobsSection applications={applications} accessToken={token} accountEmail={user.email} />
            ) : null}
          </div>
        </div>
      ) : !loadError ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No profile data.</p>
      ) : null}
    </CandidateAppShell>
  );
}
