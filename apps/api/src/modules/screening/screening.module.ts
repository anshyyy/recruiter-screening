import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { UsersModule } from '../users/users.module';
import { BolnaClient } from './bolna.client';
import { ScreeningSession } from './entities/screening-session.entity';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';

@Module({
  imports: [TypeOrmModule.forFeature([ScreeningSession, JobApplication]), AuthModule, UsersModule],
  controllers: [ScreeningController],
  providers: [ScreeningService, BolnaClient],
  exports: [ScreeningService],
})
export class ScreeningModule {}
