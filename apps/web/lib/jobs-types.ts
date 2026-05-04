/** Mirrors `EmploymentType` from the API (Postgres enum values). */
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'internship';

/** Job row as returned by `GET /jobs`. */
export type JobDto = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  employmentType: EmploymentType | null;
  createdAt: string;
  updatedAt: string;
};

/** Current hiring stage for an application (mirrors API `pipelinePhase`). */
export type ApplicationPipelinePhase = 'screening' | 'interview' | 'decision' | 'offer' | 'rejected';

/** One application with embedded job summary from `GET /job-applications/me` or `POST /jobs/:id/apply`. */
export type AppliedJobDto = {
  applicationId: string;
  appliedAt: string;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    employmentType: EmploymentType | null;
  };
  /** Present on API versions that snapshot profile data per application. */
  submittedSkills?: string[];
  submittedResumeFileName?: string | null;
  /** Current stage; older clients may omit — treat as `screening`. */
  pipelinePhase?: ApplicationPipelinePhase;
};

const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
};

export function labelForEmploymentType(value: EmploymentType | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return EMPLOYMENT_LABELS[value] ?? value;
}
