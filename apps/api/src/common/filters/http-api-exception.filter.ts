import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorBody, ApiErrorEnvelope } from '../interfaces/api-response.interface';

/**
 * Maps Nest/HTTP exceptions to the same envelope shape as `TransformResponseInterceptor`.
 */
@Catch()
export class HttpApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorBody: ApiErrorBody = {
      statusCode: status,
      message: 'Internal server error',
    };
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        errorBody = { statusCode: status, message: res };
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        const rawMessage = body.message;
        const normalized =
          Array.isArray(rawMessage) ? rawMessage : typeof rawMessage === 'string' ? rawMessage : exception.message;
        errorBody = {
          statusCode: typeof body.statusCode === 'number' ? body.statusCode : status,
          message: normalized,
        };
        message = Array.isArray(normalized) ? normalized.join(', ') : String(normalized);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      errorBody = { statusCode: status, message: exception.message };
      message = exception.message;
    } else {
      this.logger.error('Unknown exception', String(exception));
    }

    const payload: ApiErrorEnvelope = {
      success: false,
      error: errorBody,
      data: null,
      message,
    };

    response.status(status).json(payload);
  }
}
