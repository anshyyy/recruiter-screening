'use client';

import type { ApplicationTimelineStep, ApplicationTimelineStepStatus } from '@/lib/application-timeline';

export type ApplicationTimelineProps = {
  steps: ApplicationTimelineStep[];
};

function dotClass(status: ApplicationTimelineStepStatus): string {
  switch (status) {
    case 'completed':
    case 'completed_success':
      return 'border-emerald-500 bg-emerald-500 dark:border-emerald-400 dark:bg-emerald-400';
    case 'current':
      return 'border-indigo-600 bg-white ring-2 ring-indigo-200 dark:border-indigo-400 dark:bg-zinc-900 dark:ring-indigo-900/80';
    case 'completed_declined':
      return 'border-red-500 bg-red-500 dark:border-red-400 dark:bg-red-400';
    case 'skipped':
    case 'upcoming':
    default:
      return 'border-zinc-300 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800';
  }
}

function lineClass(status: ApplicationTimelineStepStatus): string {
  switch (status) {
    case 'upcoming':
    case 'skipped':
      return 'border-zinc-200 dark:border-zinc-700';
    case 'completed_declined':
      return 'border-red-200 dark:border-red-900/50';
    default:
      return 'border-indigo-200 dark:border-indigo-900/60';
  }
}

/**
 * Vertical phase timeline for a single job application.
 */
export function ApplicationTimeline({ steps }: ApplicationTimelineProps) {
  return (
    <ol className="relative space-y-0" aria-label="Application progress">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {!isLast ? (
              <span
                className={['absolute left-[7px] top-4 h-[calc(100%-0.5rem)] border-l-2', lineClass(step.status)].join(' ')}
                aria-hidden
              />
            ) : null}
            <span
              className={[
                'relative z-[1] mt-0.5 size-4 shrink-0 rounded-full border-2',
                dotClass(step.status),
              ].join(' ')}
              aria-hidden
            />
            <div className="min-w-0 flex-1 pt-0">
              <p
                className={[
                  'text-sm font-semibold',
                  step.status === 'upcoming' || step.status === 'skipped'
                    ? 'text-zinc-500 dark:text-zinc-500'
                    : 'text-zinc-900 dark:text-zinc-50',
                ].join(' ')}
              >
                {step.title}
              </p>
              <p
                className={[
                  'mt-0.5 text-sm',
                  step.status === 'completed_declined'
                    ? 'text-red-800 dark:text-red-200'
                    : step.status === 'completed_success'
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-zinc-600 dark:text-zinc-400',
                ].join(' ')}
              >
                {step.subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
