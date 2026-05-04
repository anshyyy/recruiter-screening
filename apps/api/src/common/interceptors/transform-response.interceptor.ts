import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessEnvelope } from '../interfaces/api-response.interface';

/**
 * Wraps successful controller results in a stable JSON shape for clients.
 */
@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiSuccessEnvelope> {
    return next.handle().pipe(
      map((data: unknown) => ({
        success: true as const,
        error: null,
        data: data === undefined ? null : data,
        message: 'Request successful',
      })),
    );
  }
}
