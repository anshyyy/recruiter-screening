/**
 * Matches Nest `TransformResponseInterceptor` / `HttpApiExceptionFilter` payloads.
 */
export type ApiSuccessBody<T> = {
  success: true;
  error: null;
  data: T;
  message: string;
};

export type ApiErrorBody = {
  success: false;
  error: { statusCode: number; message: string | string[] };
  data: null;
  message: string;
};

export type ApiBody<T> = ApiSuccessBody<T> | ApiErrorBody;

export function isApiSuccess<T>(body: ApiBody<T>): body is ApiSuccessBody<T> {
  return body.success === true;
}
