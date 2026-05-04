import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';
import type { SafeUser } from '../users/types/safe-user.type';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AppliedJobView } from './job-applications.service';
import { JobApplicationsService } from './job-applications.service';
import { Job } from './entities/job.entity';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobApplicationsService: JobApplicationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List open jobs' })
  @ApiOkResponse({ description: 'All jobs (newest first)' })
  async list(): Promise<Job[]> {
    return this.jobsService.findAll();
  }

  @Post(':jobId/apply')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Apply to a job (authenticated); requires profile skills + résumé' })
  @ApiCreatedResponse({ description: 'Application created' })
  @ApiBadRequestResponse({ description: 'Profile incomplete (skills / résumé)' })
  @ApiNotFoundResponse({ description: 'Job does not exist' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async apply(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Req() req: Request & { user: SafeUser },
  ): Promise<AppliedJobView> {
    return this.jobApplicationsService.apply(req.user.id, jobId);
  }
}
