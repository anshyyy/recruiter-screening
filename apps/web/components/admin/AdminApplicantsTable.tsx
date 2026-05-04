'use client';

import type { AdminApplicationListItem } from '@/lib/admin-types';
import { labelAdminPipelinePhase, labelAdminScreeningStatus } from '@/lib/admin-labels';
import { normalizePipelinePhase } from '@/lib/application-timeline';

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

function formatScore(score: number | null): string {
  if (score == null) {
    return '—';
  }
  return `${Math.round(score * 100)}%`;
}

export type AdminApplicantsTableProps = {
  rows: AdminApplicationListItem[];
  onInspect: (applicationId: string) => void;
};

/** Compact applicant index with pipeline + AI screening summary columns. */
export function AdminApplicantsTable({ rows, onInspect }: AdminApplicantsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
        No applications for this job yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/50">
            <th scope="col" className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
              Candidate
            </th>
            <th scope="col" className="hidden px-4 py-3 font-semibold text-zinc-900 md:table-cell dark:text-zinc-50">
              Applied
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
              Stage
            </th>
            <th scope="col" className="hidden px-4 py-3 font-semibold text-zinc-900 lg:table-cell dark:text-zinc-50">
              Screening
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
              Score
            </th>
            <th scope="col" className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const phase = normalizePipelinePhase(row.pipelinePhase);
            const name = row.candidate.fullName?.trim() || row.candidate.email;
            return (
              <tr
                key={row.applicationId}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/80"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">{name}</div>
                  <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-500">{row.candidate.email}</div>
                  <div className="mt-1 text-xs text-zinc-500 md:hidden">{formatAppliedAt(row.appliedAt)}</div>
                </td>
                <td className="hidden px-4 py-3 align-top text-zinc-600 tabular-nums md:table-cell dark:text-zinc-400">
                  {formatAppliedAt(row.appliedAt)}
                </td>
                <td className="px-4 py-3 align-top text-zinc-700 dark:text-zinc-300">
                  {labelAdminPipelinePhase(phase)}
                </td>
                <td className="hidden px-4 py-3 align-top lg:table-cell">
                  <span className="text-zinc-700 dark:text-zinc-300">
                    {labelAdminScreeningStatus(row.screening.status)}
                  </span>
                </td>
                <td className="px-4 py-3 align-top tabular-nums text-zinc-800 dark:text-zinc-200">
                  {formatScore(row.screening.score)}
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    type="button"
                    onClick={() => onInspect(row.applicationId)}
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 dark:bg-violet-700 dark:hover:bg-violet-600"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
