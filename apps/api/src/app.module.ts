import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SeedModule } from './database/seed/seed.module';
import { createTypeOrmRootOptions } from './database/typeorm-root-options';
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';

// Resolved from compiled `dist/` (or `src/` under ts-node): always `apps/api`, not `process.cwd()`.
const apiRoot = join(__dirname, '..');
const monorepoRoot = join(__dirname, '..', '..', '..');

@Module({
  imports: [
    // Node does not load `.env` by itself; this mirrors values into `process.env` for `main.ts` etc.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(apiRoot, '.env.local'),
        join(apiRoot, '.env'),
        join(monorepoRoot, '.env'),
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createTypeOrmRootOptions(config),
    }),
    UsersModule,
    AuthModule,
    JobsModule,
    SeedModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
