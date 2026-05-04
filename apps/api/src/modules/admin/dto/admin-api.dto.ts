import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationPipelinePhase } from '../../jobs/enums/application-pipeline-phase.enum';
import { EmploymentType } from '../../jobs/enums/employment-type.enum';
import { ScreeningStatus } from '../../screening/enums/screening-status.enum';

/** Aggregated job row for the admin job picker. */
export class AdminJobListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  company!: string;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ enum: EmploymentType, nullable: true })
  employmentType!: EmploymentType | null;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty({ description: 'Number of applications for this job' })
  applicationCount!: number;
}

export class AdminCandidateSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  fullName!: string | null;

  /** Phone captured on the application snapshot (E.164 when present). */
  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;
}

export class AdminScreeningSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  sessionId!: string | null;

  @ApiProperty({ enum: ScreeningStatus })
  status!: ScreeningStatus;

  @ApiProperty()
  attemptCount!: number;

  @ApiPropertyOptional({ nullable: true, description: 'Fit score 0–1 when screening completed' })
  score!: number | null;

  @ApiPropertyOptional({ nullable: true })
  summary!: string | null;

  @ApiPropertyOptional({ nullable: true })
  initiatedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;
}

export class AdminScreeningDetailDto extends AdminScreeningSummaryDto {
  @ApiPropertyOptional({
    nullable: true,
    description: 'Call recording URL when provided by the voice provider',
  })
  recordingUrl!: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Structured slots extracted from the conversation',
    type: 'object',
    additionalProperties: true,
  })
  extractedData!: Record<string, unknown> | null;

  @ApiPropertyOptional({
    nullable: true,
    isArray: true,
    description: 'Conversation turns (agent / candidate / system)',
  })
  transcript!: { role: string; text: string; at?: string }[] | null;
}

export class AdminApplicationListItemDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  appliedAt!: string;

  @ApiProperty({ enum: ApplicationPipelinePhase })
  pipelinePhase!: ApplicationPipelinePhase;

  @ApiProperty({ type: AdminCandidateSummaryDto })
  candidate!: AdminCandidateSummaryDto;

  @ApiProperty({ type: [String] })
  submittedSkills!: string[];

  @ApiPropertyOptional({ nullable: true })
  submittedResumeFileName!: string | null;

  @ApiProperty({ type: AdminScreeningSummaryDto })
  screening!: AdminScreeningSummaryDto;
}

export class AdminJobSummaryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  company!: string;

  @ApiPropertyOptional({ nullable: true })
  location!: string | null;

  @ApiPropertyOptional({ enum: EmploymentType, nullable: true })
  employmentType!: EmploymentType | null;
}

export class AdminApplicationDetailDto {
  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  appliedAt!: string;

  @ApiProperty({ enum: ApplicationPipelinePhase })
  pipelinePhase!: ApplicationPipelinePhase;

  @ApiProperty({ type: AdminCandidateSummaryDto })
  candidate!: AdminCandidateSummaryDto;

  @ApiProperty({ type: [String] })
  submittedSkills!: string[];

  @ApiPropertyOptional({ nullable: true })
  submittedResumeFileName!: string | null;

  @ApiProperty({ type: AdminJobSummaryDto })
  job!: AdminJobSummaryDto;

  @ApiProperty({ type: AdminScreeningDetailDto })
  screening!: AdminScreeningDetailDto;
}
