import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { ScreeningModule } from '../screening/screening.module';
import { ScreeningSession } from '../screening/entities/screening-session.entity';
import { UsersModule } from '../users/users.module';
import { TechnicalInterviewBooking } from './entities/technical-interview-booking.entity';
import { TechnicalInterviewController } from './technical-interview.controller';
import { TechnicalInterviewSchedulingService } from './technical-interview-scheduling.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TechnicalInterviewBooking, JobApplication, ScreeningSession]),
    ScreeningModule,
    UsersModule,
  ],
  controllers: [TechnicalInterviewController],
  providers: [TechnicalInterviewSchedulingService],
  exports: [TechnicalInterviewSchedulingService],
})
export class InterviewSchedulingModule {}
