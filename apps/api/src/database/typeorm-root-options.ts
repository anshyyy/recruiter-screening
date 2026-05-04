import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * Builds Nest `TypeOrmModule` root options from `ConfigService`.
 * `synchronize: true` applies entity schema to the database on startup (dev-friendly; risky in production).
 */
export function createTypeOrmRootOptions(
  config: ConfigService,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.getOrThrow<string>('DATABASE_URL'),
    autoLoadEntities: true,
    synchronize: true,
  };
}
