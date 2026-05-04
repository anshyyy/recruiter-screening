'use client';

import { useEffect, useRef } from 'react';
import { ApplicationScreeningSection } from '@/components/jobs/ApplicationScreeningSection';
import { ApplicationTimeline } from '@/components/jobs/ApplicationTimeline';
import { buildApplicationTimeline, normalizePipelinePhase } from '@/lib/application-timeline';
import type { AppliedJobDto } from '@/lib/jobs-types';
import { labelForEmploymentType } from '@/lib/jobs-types';

export type ApplicationProgressDialogProps = {
  application: AppliedJobDto | null;
  onDismiss: () => void;
};

/**
 * Modal detail for one application: role summary plus hiring timeline phases.
 */
export function ApplicationProgressDialog({ application, onDismiss }: ApplicationProgressDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (application) {
      if (!el.open) {
        el.showModal();
      }
    } else if (el.open) {
      el.close();
    }
  }, [application]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const onClose = () => onDismiss();
    el.addEventListener('close', onClose);
    return () => el.removeEventListener('close', onClose);
  }, [onDismiss]);

  const employmentLabel = application ? labelForEmploymentType(application.job.employmentType) : null;

  return (
    <dialog
      ref={ref}
      className="fixed left-1/2 top-1/2 z-50 w-[min(100%,28rem)] max-h-[min(90vh,40rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-0 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/50 open:flex open:flex-col dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
      aria-labelledby={application ? 'application-progress-title' : undefined}
    >
      {application ? (
        <>
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 id="application-progress-title" className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
              {application.job.title}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {application.job.company}
              {application.job.location ? ` · ${application.job.location}` : null}
              {employmentLabel ? ` · ${employmentLabel}` : null}
            </p>
          </div>

          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Your process</h3>
            <div className="mt-4">
              <ApplicationTimeline steps={buildApplicationTimeline(application.pipelinePhase, application.appliedAt)} />
            </div>
          </div>

          <ApplicationScreeningSection
            applicationId={application.applicationId}
            active={normalizePipelinePhase(application.pipelinePhase) === 'screening'}
          />

          {(application.submittedSkills?.length ?? 0) > 0 || application.submittedResumeFileName ? (
            <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What you submitted</h3>
              {(application.submittedSkills?.length ?? 0) > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {(application.submittedSkills ?? []).map((s) => (
                    <li
                      key={`${application.applicationId}-${s}`}
                      className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-zinc-700"
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              ) : null}
              {application.submittedResumeFileName ? (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Résumé:{' '}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{application.submittedResumeFileName}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-auto border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
            <button
              type="button"
              className="w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              onClick={() => ref.current?.close()}
            >
              Close
            </button>
          </div>
        </>
      ) : null}
    </dialog>
  );
}
