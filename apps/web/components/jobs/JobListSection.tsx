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
}: JobListSectionProps) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
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

        return (
          <li
            key={job.id}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {job.company}
                  {job.location ? ` · ${job.location}` : null}
                  {employment ? ` · ${employment}` : null}
                </p>
                <p className="pt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{job.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <button
                  type="button"
                  disabled={disabled || applied || busy}
                  onClick={() => onApply(job.id)}
                  className={[
                    'rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                    applied
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
                      : 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
                  ].join(' ')}
                >
                  {busy ? 'Applying…' : applied ? 'Applied' : 'Apply'}
                </button>
                {applyError ? (
                  <p className="max-w-xs text-right text-xs text-red-600 dark:text-red-400" role="alert">
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
