import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleServiceError } from '../../common/utils/service-error';
import { Job } from './entities/job.entity';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async findAll(): Promise<Job[]> {
    try {
      return await this.jobsRepo.find({ order: { createdAt: 'DESC' } });
    } catch (error: unknown) {
      handleServiceError(this.logger, 'JobsService.findAll', error);
    }
  }

  async findById(id: string): Promise<Job | null> {
    try {
      return await this.jobsRepo.findOne({ where: { id } });
    } catch (error: unknown) {
      handleServiceError(this.logger, 'JobsService.findById', error);
    }
  }
}
