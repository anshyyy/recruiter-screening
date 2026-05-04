import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  RescoreScreeningResponseDto,
} from './dto/admin-api.dto';
import { AdminService } from './admin.service';
import { InitiateTechnicalInterviewCallResponseDto } from '../interview-scheduling/dto/technical-interview.dto';
import { TechnicalInterviewSchedulingService } from '../interview-scheduling/technical-interview-scheduling.service';
import { ScreeningService } from '../screening/screening.service';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
@ApiForbiddenResponse({ description: 'Not an administrator' })
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly screeningService: ScreeningService,
    private readonly technicalInterviewScheduling: TechnicalInterviewSchedulingService,
  ) {}

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

  @Post('applications/:applicationId/rescore-screening')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Recompute screening score from stored transcript (heuristic + configured LLM). Use after a failed or missing score.',
  })
  @ApiOkResponse({ type: RescoreScreeningResponseDto })
  @ApiNotFoundResponse({ description: 'No screening session for this application' })
  @ApiBadRequestResponse({ description: 'Transcript missing on session' })
  async rescoreScreening(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<RescoreScreeningResponseDto> {
    return this.screeningService.rescoreScreeningForApplication(applicationId);
  }

  @Post('applications/:applicationId/technical-interview-call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'If screening score meets the pass threshold, dial the candidate via Bolna to schedule the technical interview (optional agent + slots in env).',
  })
  @ApiOkResponse({ type: InitiateTechnicalInterviewCallResponseDto })
  @ApiNotFoundResponse({ description: 'Application not found' })
  @ApiBadRequestResponse({ description: 'Not eligible or missing phone' })
  async initiateTechnicalInterviewCall(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<InitiateTechnicalInterviewCallResponseDto> {
    return this.technicalInterviewScheduling.initiateSchedulingCallForApplication(applicationId);
  }
}
