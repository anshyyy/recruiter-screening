/** Normalized API error payload inside the HTTP envelope. */
export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
};

/** Successful HTTP response envelope (see `TransformResponseInterceptor`). */
export type ApiSuccessEnvelope<T = unknown> = {
  success: true;
  error: null;
  data: T;
  message: string;
};

/** Error HTTP response envelope (see `HttpApiExceptionFilter`). */
export type ApiErrorEnvelope = {
  success: false;
  error: ApiErrorBody;
  data: null;
  message: string;
};

export type ApiEnvelope<T = unknown> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
