import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { UploadModule } from '../upload/upload.module';
import { UsersModule } from '../users/users.module';
import { BolnaClient } from './bolna.client';
import { ScreeningSession } from './entities/screening-session.entity';
import { ResumeTextExtractor } from './resume-text.extractor';
import { ScreeningLlmScoringService } from './llm-scoring/screening-llm-scoring.service';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScreeningSession, JobApplication]),
    AuthModule,
    UsersModule,
    UploadModule,
  ],
  controllers: [ScreeningController],
  providers: [ScreeningService, ScreeningLlmScoringService, BolnaClient, ResumeTextExtractor],
  exports: [ScreeningService],
})
export class ScreeningModule {}
