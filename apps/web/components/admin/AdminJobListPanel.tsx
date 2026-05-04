'use client';

import type { AdminJobListItem } from '@/lib/admin-types';
import { labelForEmploymentType } from '@/lib/jobs-types';

export type AdminJobListPanelProps = {
  jobs: AdminJobListItem[];
  selectedJobId: string | null;
  onSelectJob: (jobId: string) => void;
};

/**
 * Selectable list of open roles with application counts (left rail on wide layouts).
 */
export function AdminJobListPanel({ jobs, selectedJobId, onSelectJob }: AdminJobListPanelProps) {
  if (jobs.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No jobs in the system yet.
      </p>
    );
  }

  return (
    <ul className="flex list-none flex-col gap-2 p-0" role="listbox" aria-label="Jobs">
      {jobs.map((job) => {
        const selected = job.id === selectedJobId;
        const employment = labelForEmploymentType(job.employmentType);
        return (
          <li key={job.id}>
            <button
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onSelectJob(job.id)}
              className={[
                'w-full rounded-xl border px-4 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                selected
                  ? 'border-violet-300 bg-violet-50/90 shadow-sm dark:border-violet-800 dark:bg-violet-950/40'
                  : 'border-zinc-200 bg-white/80 hover:border-violet-200 hover:bg-violet-50/50 dark:border-zinc-800 dark:bg-zinc-950/60 dark:hover:border-violet-900/60',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{job.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                    {job.company}
                    {job.location ? ` · ${job.location}` : ''}
                    {employment ? ` · ${employment}` : ''}
                  </p>
                </div>
                <span
                  className={[
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
                    selected
                      ? 'bg-violet-200 text-violet-950 dark:bg-violet-900/80 dark:text-violet-100'
                      : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                  ].join(' ')}
                >
                  {job.applicationCount}
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
