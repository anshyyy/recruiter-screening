'use client';

import type { JobDto } from '@/lib/jobs-types';
import { labelForEmploymentType } from '@/lib/jobs-types';

export type JobListSectionProps = {
  jobs: JobDto[];
  appliedJobIds: ReadonlySet<string>;
  applyingJobId: string | null;
  getApplyError: (jobId: string) => string | undefined;
  onApply: (jobId: string) => void;
  disabled?: boolean;
  /** When set, blocks Apply for roles not yet applied (e.g. incomplete profile). */
  applyBlockedReason?: string | null;
};

/**
 * Renders open roles with an apply action; apply state is controlled by the parent.
 */
export function JobListSection({
  jobs,
  appliedJobIds,
  applyingJobId,
  getApplyError,
  onApply,
  disabled,
  applyBlockedReason,
}: JobListSectionProps) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-zinc-200 bg-white/80 px-4 py-10 text-center text-sm text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No open roles right now. Check back later.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {jobs.map((job) => {
        const applied = appliedJobIds.has(job.id);
        const busy = applyingJobId === job.id;
        const employment = labelForEmploymentType(job.employmentType);
        const applyError = getApplyError(job.id);
        const blockNewApply = Boolean(applyBlockedReason) && !applied;

        return (
          <li
            key={job.id}
            className="rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{job.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {job.company}
                  {job.location ? ` · ${job.location}` : null}
                  {employment ? ` · ${employment}` : null}
                </p>
                <p className="pt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{job.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:max-w-[220px] sm:items-end">
                <button
                  type="button"
                  disabled={disabled || applied || busy || blockNewApply}
                  onClick={() => onApply(job.id)}
                  className={[
                    'rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    applied
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400',
                  ].join(' ')}
                >
                  {busy ? 'Applying…' : applied ? 'Applied' : 'Apply with profile'}
                </button>
                {blockNewApply && applyBlockedReason ? (
                  <p className="text-right text-xs leading-snug text-amber-800 dark:text-amber-200/90">{applyBlockedReason}</p>
                ) : null}
                {applyError ? (
                  <p className="text-right text-xs text-red-600 dark:text-red-400" role="alert">
                    {applyError}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
