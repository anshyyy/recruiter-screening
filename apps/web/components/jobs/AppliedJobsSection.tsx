'use client';

import type { AppliedJobDto } from '@/lib/jobs-types';
import { labelForEmploymentType } from '@/lib/jobs-types';

export type AppliedJobsSectionProps = {
  applications: AppliedJobDto[];
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatAppliedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return dateFormatter.format(d);
}

/**
 * Lists roles the user has already applied to, newest first (order from API).
 */
export function AppliedJobsSection({ applications }: AppliedJobsSectionProps) {
  return (
    <section
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      aria-labelledby="applied-jobs-heading"
    >
      <h2 id="applied-jobs-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Your applications
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Roles you have submitted an application for.</p>

      {applications.length === 0 ? (
        <p className="mt-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-6 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
          You have not applied to any roles yet. Pick a job from the list and press Apply.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {applications.map((row) => {
            const employment = labelForEmploymentType(row.job.employmentType);
            return (
              <li key={row.applicationId} className="flex flex-col gap-1 py-4 first:pt-0">
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{row.job.title}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {row.job.company}
                  {row.job.location ? ` · ${row.job.location}` : null}
                  {employment ? ` · ${employment}` : null}
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-500">Applied {formatAppliedAt(row.appliedAt)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
