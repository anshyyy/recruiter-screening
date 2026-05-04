import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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

@ApiTags('job-applications')
@Controller('job-applications')
export class JobApplicationsController {
  constructor(private readonly jobApplicationsService: JobApplicationsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Jobs you have applied to' })
  @ApiOkResponse({ description: 'Applications with job summary, newest first' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  async myApplications(@Req() req: Request & { user: SafeUser }): Promise<AppliedJobView[]> {
    return this.jobApplicationsService.findAppliedForUser(req.user.id);
  }
}
