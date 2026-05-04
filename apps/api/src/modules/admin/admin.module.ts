import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { Job } from '../jobs/entities/job.entity';
import { ScreeningSession } from '../screening/entities/screening-session.entity';
import { ScreeningModule } from '../screening/screening.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, JobApplication, ScreeningSession]),
    AuthModule,
    ScreeningModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
