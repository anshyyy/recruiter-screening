import type { ApplicationPipelinePhase } from '@/lib/jobs-types';

/** Visual state for one row in the hiring timeline. */
export type ApplicationTimelineStepStatus =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'completed_success'
  | 'completed_declined'
  | 'skipped';

export type ApplicationTimelineStep = {
  id: string;
  title: string;
  subtitle: string;
  status: ApplicationTimelineStepStatus;
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

/** Accept API string; unknown or missing values default to screening (new applications). */
export function normalizePipelinePhase(value: string | undefined | null): ApplicationPipelinePhase {
  switch (value) {
    case 'screening':
    case 'interview':
    case 'decision':
    case 'offer':
    case 'rejected':
      return value;
    default:
      return 'screening';
  }
}

/**
 * Builds ordered steps for the candidate-facing pipeline (submitted → screening → interview → decision).
 * Driven by the current `pipelinePhase` from the API.
 */
export function buildApplicationTimeline(
  pipelinePhase: ApplicationPipelinePhase | undefined | null,
  appliedAtIso: string,
): ApplicationTimelineStep[] {
  const phase = normalizePipelinePhase(pipelinePhase ?? undefined);
  const received = formatAppliedAt(appliedAtIso);

  const submitted: ApplicationTimelineStep = {
    id: 'submitted',
    title: 'Application submitted',
    subtitle: `Received ${received}`,
    status: 'completed',
  };

  if (phase === 'rejected') {
    return [
      submitted,
      {
        id: 'screening',
        title: 'Screening',
        subtitle: 'This application is closed for this role.',
        status: 'completed_declined',
      },
      {
        id: 'interview',
        title: 'Interview',
        subtitle: 'No further steps for this application.',
        status: 'skipped',
      },
      {
        id: 'outcome',
        title: 'Later stages',
        subtitle: 'Not applicable.',
        status: 'skipped',
      },
    ];
  }

  if (phase === 'screening') {
    return [
      submitted,
      {
        id: 'screening',
        title: 'Screening',
        subtitle: 'The team is reviewing your profile and résumé.',
        status: 'current',
      },
      {
        id: 'interview',
        title: 'Interview',
        subtitle: 'You will be contacted here if you move forward.',
        status: 'upcoming',
      },
      {
        id: 'outcome',
        title: 'Decision',
        subtitle: 'Final outcome after interviews.',
        status: 'upcoming',
      },
    ];
  }

  if (phase === 'interview') {
    return [
      submitted,
      {
        id: 'screening',
        title: 'Screening',
        subtitle: 'Completed.',
        status: 'completed',
      },
      {
        id: 'interview',
        title: 'Interview',
        subtitle: 'Interview or next steps are in progress.',
        status: 'current',
      },
      {
        id: 'outcome',
        title: 'Decision',
        subtitle: 'Final outcome after interviews.',
        status: 'upcoming',
      },
    ];
  }

  if (phase === 'decision') {
    return [
      submitted,
      {
        id: 'screening',
        title: 'Screening',
        subtitle: 'Completed.',
        status: 'completed',
      },
      {
        id: 'interview',
        title: 'Interview',
        subtitle: 'Completed.',
        status: 'completed',
      },
      {
        id: 'outcome',
        title: 'Decision',
        subtitle: 'The team is finalizing the outcome.',
        status: 'current',
      },
    ];
  }

  // offer
  return [
    submitted,
    {
      id: 'screening',
      title: 'Screening',
      subtitle: 'Completed.',
      status: 'completed',
    },
    {
      id: 'interview',
      title: 'Interview',
      subtitle: 'Completed.',
      status: 'completed',
    },
    {
      id: 'outcome',
      title: 'Offer',
      subtitle: 'An offer has been extended for this role.',
      status: 'completed_success',
    },
  ];
}
