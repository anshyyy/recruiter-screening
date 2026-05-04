import {
  ConflictException,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * Maps unexpected persistence/runtime errors to HTTP-friendly exceptions.
 * Re-throws {@link HttpException} unchanged so controllers keep control flow.
 */
export function handleServiceError(logger: Logger, context: string, error: unknown): never {
  logger.error(`[${context}] ${error}`);
  if (error instanceof HttpException) {
    throw error;
  }

  if (error instanceof QueryFailedError) {
    const code = (error.driverError as { code?: string } | undefined)?.code;
    if (code === '23505') {
      throw new ConflictException('A record with this value already exists');
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  logger.error(`[${context}] ${message}`, stack);

  throw new InternalServerErrorException('An unexpected error occurred');
}
