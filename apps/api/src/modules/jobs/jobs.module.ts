import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { JobApplication } from './entities/job-application.entity';
import { Job } from './entities/job.entity';
import { JobApplicationsController } from './job-applications.controller';
import { JobApplicationsService } from './job-applications.service';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobApplication]), AuthModule, UsersModule],
  controllers: [JobsController, JobApplicationsController],
  providers: [JobsService, JobApplicationsService],
  exports: [JobsService, JobApplicationsService],
})
export class JobsModule {}
