import type { ApplicationPipelinePhase } from '@/lib/jobs-types';
import type { ScreeningStatus } from '@/lib/admin-types';

const PIPELINE: Record<ApplicationPipelinePhase, string> = {
  screening: 'Screening',
  interview: 'Interview',
  decision: 'Decision',
  offer: 'Offer',
  rejected: 'Rejected',
};

const SCREENING: Record<ScreeningStatus, string> = {
  pending: 'Not started',
  initiated: 'Call initiated',
  in_progress: 'In progress',
  completed: 'Completed',
  no_answer: 'No answer',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export function labelAdminPipelinePhase(phase: ApplicationPipelinePhase): string {
  return PIPELINE[phase] ?? phase;
}

export function labelAdminScreeningStatus(status: ScreeningStatus): string {
  return SCREENING[status] ?? status;
}
