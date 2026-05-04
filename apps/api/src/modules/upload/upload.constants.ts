/** Max upload size for `POST /uploads/file` (50 MiB). */
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

export function isAllowedUploadContentType(mime: string): mime is AllowedUploadContentType {
  return (ALLOWED_UPLOAD_CONTENT_TYPES as readonly string[]).includes(mime);
}
