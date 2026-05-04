import type { ApiBody } from '@/lib/api-envelope';
import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import type { AppliedJobDto, JobDto } from '@/lib/jobs-types';
import { readApiBody } from '@/lib/read-api-body';

function throwUnlessSuccess<T>(body: ApiBody<T>): T {
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

/** Public list of open roles. */
export async function fetchOpenJobs(): Promise<JobDto[]> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/jobs`, { method: 'GET' });
  const body = await readApiBody<JobDto[]>(res);
  return throwUnlessSuccess(body);
}

/** Authenticated: jobs the current user has applied to (newest first). */
export async function fetchMyJobApplications(accessToken: string): Promise<AppliedJobDto[]> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/job-applications/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const body = await readApiBody<AppliedJobDto[]>(res);
  return throwUnlessSuccess(body);
}

/** Authenticated: create an application for the given job. */
export async function applyToJob(accessToken: string, jobId: string): Promise<AppliedJobDto> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  const body = await readApiBody<AppliedJobDto>(res);
  return throwUnlessSuccess(body);
}
