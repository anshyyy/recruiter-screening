/** Default presigned URL lifetime (seconds). */
export const PRESIGNED_URL_EXPIRES_SECONDS = 300;

/** Max declared object size for presign validation (50 MiB). */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Allowed `Content-Type` values for uploads (extend as needed). */
export const ALLOWED_UPLOAD_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
] as const;

export type AllowedUploadContentType = (typeof ALLOWED_UPLOAD_CONTENT_TYPES)[number];
