import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleServiceError } from '../../../common/utils/service-error';
import { Job } from '../../../modules/jobs/entities/job.entity';
import { JOB_SEED_RECORDS } from '../data/job-seed.records';

/** Inserts catalog jobs when the table is empty (safe to run on every boot). */
@Injectable()
export class JobsSeeder {
  private readonly logger = new Logger(JobsSeeder.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async seedIfEmpty(): Promise<void> {
    try {
      const count = await this.jobsRepo.count();
      if (count > 0) {
        return;
      }
      const rows = JOB_SEED_RECORDS.map((record) => this.jobsRepo.create(record));
      await this.jobsRepo.save(rows);
      this.logger.log(`Seeded ${rows.length} jobs`);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'JobsSeeder.seedIfEmpty', error);
    }
  }
}
