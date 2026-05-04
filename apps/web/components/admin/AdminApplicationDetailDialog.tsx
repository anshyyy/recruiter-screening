'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import type { AdminApplicationDetail } from '@/lib/admin-types';
import { fetchAdminApplicationDetail, postAdminRescoreScreening, postAdminTechnicalInterviewCall } from '@/lib/admin-api';
import { labelAdminPipelinePhase, labelAdminScreeningStatus } from '@/lib/admin-labels';
import { normalizePipelinePhase } from '@/lib/application-timeline';
import { labelForEmploymentType } from '@/lib/jobs-types';
import { ScreeningExtractedSummary } from '@/components/admin/ScreeningExtractedSummary';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatIso(iso: string | null): string {
  if (!iso) {
    return '—';
  }
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

export type AdminApplicationDetailDialogProps = {
  open: boolean;
  applicationId: string | null;
  accessToken: string;
  onClose: () => void;
  /** Refetch applicant lists (e.g. after rescore updates the score column). */
  onRescoreComplete?: (applicationId: string) => void;
};

/**
 * Full-screen dialog with screening transcript, summary, score, and structured extraction.
 * Fetches detail when opened — keeps list endpoint lightweight.
 */
export function AdminApplicationDetailDialog({
  open,
  applicationId,
  accessToken,
  onClose,
  onRescoreComplete,
}: AdminApplicationDetailDialogProps) {
  const titleId = useId();
  const [detail, setDetail] = useState<AdminApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string | null>(null);
  const [techCallLoading, setTechCallLoading] = useState(false);
  const [techCallError, setTechCallError] = useState<string | null>(null);
  const [techCallExecutionId, setTechCallExecutionId] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!applicationId) {
        return;
      }
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const d = await fetchAdminApplicationDetail(accessToken, applicationId);
        setDetail(d);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load application';
        setError(message);
        setDetail(null);
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
      }
    },
    [accessToken, applicationId],
  );

  useEffect(() => {
    setTechCallError(null);
    setTechCallExecutionId(null);
  }, [applicationId]);

  useEffect(() => {
    if (open && applicationId) {
      void load();
    } else if (!open) {
      setDetail(null);
      setError(null);
      setRescoreError(null);
      setTechCallError(null);
      setTechCallExecutionId(null);
    }
  }, [open, applicationId, load]);

  const handleRescore = useCallback(async () => {
    if (!applicationId) {
      return;
    }
    setRescoring(true);
    setRescoreError(null);
    try {
      await postAdminRescoreScreening(accessToken, applicationId);
      await load({ silent: true });
      onRescoreComplete?.(applicationId);
    } catch (e) {
      setRescoreError(e instanceof Error ? e.message : 'Rescore failed');
    } finally {
      setRescoring(false);
    }
  }, [accessToken, applicationId, load, onRescoreComplete]);

  const handleTechnicalInterviewCall = useCallback(async () => {
    if (!applicationId) {
      return;
    }
    setTechCallLoading(true);
    setTechCallError(null);
    setTechCallExecutionId(null);
    try {
      const result = await postAdminTechnicalInterviewCall(accessToken, applicationId);
      setTechCallExecutionId(result.executionId);
    } catch (e) {
      setTechCallError(e instanceof Error ? e.message : 'Scheduling call failed');
    } finally {
      setTechCallLoading(false);
    }
  }, [accessToken, applicationId]);

  if (!open) {
    return null;
  }

  const phase = detail ? normalizePipelinePhase(detail.pipelinePhase) : null;
  const canOfferTechCall =
    detail &&
    phase === 'interview' &&
    detail.screening.status === 'completed' &&
    detail.screening.score != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(100dvh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Application detail
            </h2>
            {detail ? (
              <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-400">
                {detail.job.title} · {detail.job.company}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {applicationId ? (
              <button
                type="button"
                onClick={() => void handleRescore()}
                disabled={loading || rescoring}
                className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-900 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
                title="Re-run heuristic + LLM scoring from the stored transcript"
              >
                {rescoring ? 'Rescoring…' : 'Rescore screening'}
              </button>
            ) : null}
            {applicationId && canOfferTechCall ? (
              <button
                type="button"
                onClick={() => void handleTechnicalInterviewCall()}
                disabled={loading || techCallLoading}
                className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-900 transition hover:bg-sky-100 disabled:opacity-50 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
                title="Outbound Bolna call to schedule the technical interview (must meet pass threshold on the API)"
              >
                {techCallLoading ? 'Calling…' : 'Tech interview call'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              Close
            </button>
          </div>
        </div>

        {rescoreError ? (
          <div
            className="shrink-0 border-b border-red-200 bg-red-50/90 px-5 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {rescoreError}
          </div>
        ) : null}
        {techCallError ? (
          <div
            className="shrink-0 border-b border-red-200 bg-red-50/90 px-5 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {techCallError}
          </div>
        ) : null}

        {techCallExecutionId ? (
          <div
            className="shrink-0 border-b border-sky-200 bg-sky-50/90 px-5 py-2 text-sm text-sky-950 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100"
            role="status"
          >
            Bolna execution started:{' '}
            <code className="rounded bg-sky-100/80 px-1 py-0.5 text-xs dark:bg-sky-900/80">{techCallExecutionId}</code>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
              <span
                className="inline-block size-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent"
                aria-hidden
              />
              Loading…
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          {!loading && detail ? (
            <div className="flex flex-col gap-8">
              <section aria-labelledby={`${titleId}-candidate`}>
                <h3 id={`${titleId}-candidate`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Candidate
                </h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Name</dt>
                    <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                      {detail.candidate.fullName?.trim() || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Email</dt>
                    <dd className="text-zinc-900 dark:text-zinc-100">{detail.candidate.email}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Phone</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {detail.candidate.phone ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Applied</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatIso(detail.appliedAt)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section aria-labelledby={`${titleId}-job`}>
                <h3 id={`${titleId}-job`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Role
                </h3>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {detail.job.title} · {detail.job.company}
                  {detail.job.location ? ` · ${detail.job.location}` : ''}
                  {labelForEmploymentType(detail.job.employmentType)
                    ? ` · ${labelForEmploymentType(detail.job.employmentType)}`
                    : ''}
                </p>
              </section>

              <section aria-labelledby={`${titleId}-pipeline`}>
                <h3 id={`${titleId}-pipeline`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Pipeline
                </h3>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {phase ? labelAdminPipelinePhase(phase) : '—'}
                </p>
              </section>

              <section aria-labelledby={`${titleId}-submission`}>
                <h3 id={`${titleId}-submission`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Submission snapshot
                </h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {(detail.submittedSkills ?? []).map((s) => (
                    <li
                      key={s}
                      className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Résumé file: {detail.submittedResumeFileName ?? '—'}
                </p>
              </section>

              <section aria-labelledby={`${titleId}-screening`}>
                <h3 id={`${titleId}-screening`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  AI screening
                </h3>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Status</dt>
                    <dd className="text-zinc-900 dark:text-zinc-100">
                      {labelAdminScreeningStatus(detail.screening.status)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Score</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatScore(detail.screening.score)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Attempts</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">{detail.screening.attemptCount}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Completed</dt>
                    <dd className="tabular-nums text-zinc-900 dark:text-zinc-100">
                      {formatIso(detail.screening.completedAt)}
                    </dd>
                  </div>
                </dl>

                {detail.screening.summary ? (
                  <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      Summary
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {detail.screening.summary}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">No summary yet.</p>
                )}

                {detail.screening.recordingUrl ? (
                  <p className="mt-4 text-sm">
                    <a
                      href={detail.screening.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-violet-700 underline-offset-2 hover:underline dark:text-violet-400"
                    >
                      Open call recording
                    </a>
                  </p>
                ) : null}

                <ScreeningExtractedSummary extractedData={detail.screening.extractedData} idPrefix={titleId} />

                {detail.screening.transcript && detail.screening.transcript.length > 0 ? (
                  <div className="mt-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                      Transcript
                    </p>
                    <ul className="mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
                      {detail.screening.transcript.map((turn, i) => (
                        <li
                          key={`${turn.role}-${i}-${turn.text.slice(0, 24)}`}
                          className="text-sm leading-relaxed"
                        >
                          <span className="font-semibold capitalize text-violet-700 dark:text-violet-400">
                            {turn.role}
                          </span>
                          <span className="text-zinc-600 dark:text-zinc-400">
                            {turn.at ? ` · ${turn.at}` : ''}
                          </span>
                          <p className="mt-0.5 text-zinc-900 dark:text-zinc-100">{turn.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">No transcript yet.</p>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
