import type { ApiBody } from '@/lib/api-envelope';
import { isApiSuccess } from '@/lib/api-envelope';
import type {
  AdminApplicationDetail,
  AdminApplicationListItem,
  AdminJobListItem,
} from '@/lib/admin-types';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';

function throwUnlessSuccess<T>(body: ApiBody<T>): T {
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

export async function fetchAdminJobs(accessToken: string): Promise<AdminJobListItem[]> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/admin/jobs`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readApiBody<AdminJobListItem[]>(res);
  return throwUnlessSuccess(body);
}

export async function fetchAdminApplicationsForJob(
  accessToken: string,
  jobId: string,
): Promise<AdminApplicationListItem[]> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/admin/jobs/${jobId}/applications`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readApiBody<AdminApplicationListItem[]>(res);
  return throwUnlessSuccess(body);
}

export async function fetchAdminApplicationDetail(
  accessToken: string,
  applicationId: string,
): Promise<AdminApplicationDetail> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/admin/applications/${applicationId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readApiBody<AdminApplicationDetail>(res);
  return throwUnlessSuccess(body);
}
