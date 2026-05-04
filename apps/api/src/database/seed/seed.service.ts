import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JobsSeeder } from './seeders/jobs.seeder';

/**
 * Runs database seeds after the ORM is ready. Failures are logged so the API can still start
 * (e.g. transient DB issues); fix data and restart to retry.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly jobsSeeder: JobsSeeder) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.jobsSeeder.seedIfEmpty();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Database seed failed (API still starts): ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
