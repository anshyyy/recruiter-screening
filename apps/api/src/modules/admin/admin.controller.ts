import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AdminApplicationDetailDto,
  AdminApplicationListItemDto,
  AdminJobListItemDto,
} from './dto/admin-api.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiForbiddenResponse({ description: 'Not an administrator' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'List jobs with application counts (admin)' })
  @ApiOkResponse({ type: AdminJobListItemDto, isArray: true })
  async listJobs(): Promise<AdminJobListItemDto[]> {
    return this.adminService.listJobsWithApplicationCounts();
  }

  @Get('jobs/:jobId/applications')
  @ApiOperation({ summary: 'List applicants and screening summaries for a job (admin)' })
  @ApiOkResponse({ type: AdminApplicationListItemDto, isArray: true })
  @ApiNotFoundResponse({ description: 'Job not found' })
  async listApplicationsForJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<AdminApplicationListItemDto[]> {
    return this.adminService.listApplicationsForJob(jobId);
  }

  @Get('applications/:applicationId')
  @ApiOperation({
    summary: 'Application detail with screening transcript, score, and summary (admin)',
  })
  @ApiOkResponse({ type: AdminApplicationDetailDto })
  @ApiNotFoundResponse({ description: 'Application not found' })
  async getApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<AdminApplicationDetailDto> {
    return this.adminService.getApplicationDetail(applicationId);
  }
}
