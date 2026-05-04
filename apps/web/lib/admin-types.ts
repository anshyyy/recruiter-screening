import type { ApplicationPipelinePhase, EmploymentType } from '@/lib/jobs-types';

/** Mirrors API `ScreeningStatus`. */
export type ScreeningStatus =
  | 'pending'
  | 'initiated'
  | 'in_progress'
  | 'completed'
  | 'no_answer'
  | 'failed'
  | 'cancelled';

export type AdminJobListItem = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: EmploymentType | null;
  createdAt: string;
  applicationCount: number;
};

export type AdminCandidateSummary = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
};

export type AdminScreeningSummary = {
  sessionId: string | null;
  status: ScreeningStatus;
  attemptCount: number;
  score: number | null;
  summary: string | null;
  initiatedAt: string | null;
  completedAt: string | null;
};

export type AdminScreeningDetail = AdminScreeningSummary & {
  recordingUrl: string | null;
  extractedData: Record<string, unknown> | null;
  transcript: { role: string; text: string; at?: string }[] | null;
};

export type AdminApplicationListItem = {
  applicationId: string;
  appliedAt: string;
  pipelinePhase: ApplicationPipelinePhase;
  candidate: AdminCandidateSummary;
  submittedSkills: string[];
  submittedResumeFileName: string | null;
  screening: AdminScreeningSummary;
};

export type AdminJobSummary = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  employmentType: EmploymentType | null;
};

/** `POST /admin/applications/:applicationId/rescore-screening` */
export type AdminRescoreScreeningResult = {
  applicationId: string;
  sessionId: string;
  score: string | null;
  scoreComputed: boolean;
  pipelinePhase: ApplicationPipelinePhase;
};

export type AdminApplicationDetail = {
  applicationId: string;
  appliedAt: string;
  pipelinePhase: ApplicationPipelinePhase;
  candidate: AdminCandidateSummary;
  submittedSkills: string[];
  submittedResumeFileName: string | null;
  job: AdminJobSummary;
  screening: AdminScreeningDetail;
};
