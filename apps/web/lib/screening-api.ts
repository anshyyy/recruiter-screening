import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';

/** Mirrors `ScreeningStatus` on the API. */
export type ScreeningStatus =
  | 'pending'
  | 'initiated'
  | 'in_progress'
  | 'completed'
  | 'no_answer'
  | 'failed'
  | 'cancelled';

export type ScreeningSessionDto = {
  id: string;
  applicationId: string;
  status: ScreeningStatus;
  attemptCount: number;
  canRetry: boolean;
  initiatedAt: string | null;
  completedAt: string | null;
};

export const TERMINAL_SCREENING_STATUSES: readonly ScreeningStatus[] = [
  'completed',
  'cancelled',
];

export function isScreeningInFlight(status: ScreeningStatus): boolean {
  return status === 'initiated' || status === 'in_progress';
}

export async function fetchScreeningByApplication(
  accessToken: string,
  applicationId: string,
): Promise<ScreeningSessionDto> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/screening/sessions/by-application/${applicationId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readApiBody<ScreeningSessionDto>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

export async function startScreening(
  accessToken: string,
  applicationId: string,
): Promise<ScreeningSessionDto> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/screening/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ applicationId }),
  });
  const body = await readApiBody<ScreeningSessionDto>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}
