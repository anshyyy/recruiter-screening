import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';

export type PresignPutResult = {
  uploadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
  requiredHeaders: Record<string, string>;
};

export type PresignGetResult = {
  downloadUrl: string;
  objectKey: string;
  expiresInSeconds: number;
};

/** POST `/uploads/presign-put` — obtain a URL to upload bytes to S3. */
export async function presignUploadPut(
  accessToken: string,
  input: { fileName: string; contentType: string; byteSize?: number },
): Promise<PresignPutResult> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/uploads/presign-put`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });
  const body = await readApiBody<PresignPutResult>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

/** POST `/uploads/presign-get` — short-lived download URL for an object you own. */
export async function presignUploadGet(accessToken: string, objectKey: string): Promise<PresignGetResult> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/uploads/presign-get`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objectKey }),
  });
  const body = await readApiBody<PresignGetResult>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}
