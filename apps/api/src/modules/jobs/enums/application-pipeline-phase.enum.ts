/** Candidate-facing hiring stage for a single job application (stored on `job_applications.pipeline_phase`). */
export enum ApplicationPipelinePhase {
  /** Recruiter is reviewing the application materials (default after apply). */
  SCREENING = 'screening',
  INTERVIEW = 'interview',
  DECISION = 'decision',
  OFFER = 'offer',
  REJECTED = 'rejected',
}
