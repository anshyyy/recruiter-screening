import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';

export type FileUploadResult = {
  /** Plain `https://{bucket}.s3.{region}.amazonaws.com/{key}` — no query string. */
  fileUrl: string;
  objectKey: string;
};

export type UploadReadUrlResult = {
  downloadUrl: string;
  objectKey: string;
};

/**
 * POST `/uploads/file` — multipart `file`. Returns `fileUrl` + `objectKey`; then PATCH profile
 * with `resumeObjectKey` / `resumeFileName` (or other fields) as your app requires.
 */
export async function requestUploadFile(accessToken: string, file: File): Promise<FileUploadResult> {
  const base = getPublicApiBaseUrl();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${base}/uploads/file`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });
  const body = await readApiBody<FileUploadResult>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

/** POST `/uploads/read-url` — plain HTTPS URL for a key that matches your profile `resumeObjectKey`. */
export async function requestUploadReadUrl(
  accessToken: string,
  objectKey: string,
): Promise<UploadReadUrlResult> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/uploads/read-url`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objectKey }),
  });
  const body = await readApiBody<UploadReadUrlResult>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return body.data;
}

/** POST `/uploads/delete` — remove object whose key matches your profile `resumeObjectKey`. */
export async function requestUploadDelete(accessToken: string, objectKey: string): Promise<void> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/uploads/delete`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objectKey }),
  });
  const body = await readApiBody<unknown>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
}
