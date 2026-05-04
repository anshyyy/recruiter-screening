'use client';

import { useCallback, useState } from 'react';
import { ApplicationProgressDialog } from '@/components/jobs/ApplicationProgressDialog';
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
 * Lists roles the user has applied to. Rows open a dialog with the hiring timeline and submission snapshot.
 */
export function AppliedJobsSection({ applications }: AppliedJobsSectionProps) {
  const [activeApplication, setActiveApplication] = useState<AppliedJobDto | null>(null);

  const dismissProgress = useCallback(() => {
    setActiveApplication(null);
  }, []);

  return (
    <section
      className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-md shadow-zinc-900/5 ring-1 ring-black/[0.03] backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-white/[0.06]"
      aria-labelledby="applied-jobs-heading"
    >
      <ApplicationProgressDialog application={activeApplication} onDismiss={dismissProgress} />

      <h2 id="applied-jobs-heading" className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
        Your applications
      </h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Click an application to see your process timeline and what you submitted.
      </p>

      {applications.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
          No applications yet. Complete your profile, then apply from the Jobs page.
        </p>
      ) : (
        <ul className="mt-6 flex list-none flex-col gap-4 p-0">
          {applications.map((row) => {
            const employment = labelForEmploymentType(row.job.employmentType);
            const skills = row.submittedSkills ?? [];
            const resumeName = row.submittedResumeFileName ?? null;

            return (
              <li key={row.applicationId}>
                <button
                  type="button"
                  onClick={() => setActiveApplication(row)}
                  className="w-full rounded-xl border border-zinc-100 bg-zinc-50/50 p-4 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-900/60 dark:hover:bg-indigo-950/30"
                  aria-haspopup="dialog"
                  aria-label={`View process for ${row.job.title} at ${row.job.company}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">{row.job.title}</p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {row.job.company}
                        {row.job.location ? ` · ${row.job.location}` : null}
                        {employment ? ` · ${employment}` : null}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-500 dark:text-zinc-500">Applied {formatAppliedAt(row.appliedAt)}</p>
                  </div>

                  {skills.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <li
                          key={`${row.applicationId}-${s}`}
                          className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600"
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {resumeName ? (
                    <p className="mt-2 text-xs font-medium text-indigo-800 dark:text-indigo-200">
                      Résumé: <span className="font-normal text-zinc-700 dark:text-zinc-300">{resumeName}</span>
                    </p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
