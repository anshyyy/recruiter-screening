import type { ApiBody } from '@/lib/api-envelope';
import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';
import type {
  TechnicalInterviewConfirmPayload,
  TechnicalInterviewConfirmResult,
  TechnicalInterviewState,
} from '@/lib/technical-interview-types';

function throwUnlessSuccess<T>(body: ApiBody<T>): T {
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

export async function fetchTechnicalInterviewState(
  accessToken: string,
  applicationId: string,
): Promise<TechnicalInterviewState> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(
    `${base}/technical-interviews/applications/${applicationId}/state`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  const body = await readApiBody<TechnicalInterviewState>(res);
  return throwUnlessSuccess(body);
}

export async function postTechnicalInterviewConfirm(
  accessToken: string,
  payload: TechnicalInterviewConfirmPayload,
): Promise<TechnicalInterviewConfirmResult> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/technical-interviews/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const body = await readApiBody<TechnicalInterviewConfirmResult>(res);
  return throwUnlessSuccess(body);
}
