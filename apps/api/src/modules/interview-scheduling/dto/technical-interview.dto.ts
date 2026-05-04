import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Candidate confirms the slot they want plus email and timezone. */
export class ConfirmTechnicalInterviewDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  applicationId!: string;

  /** Must match the authenticated user's email (we verify server-side). */
  @ApiProperty({ format: 'email' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  /** Slot start in UTC (must be one of the configured available ISO instants). */
  @ApiProperty({ example: '2026-05-12T15:00:00.000Z' })
  @IsDateString()
  slotStartIsoUtc!: string;

  /** IANA zone for how the candidate interprets the scheduled time. */
  @ApiProperty({ example: 'America/New_York' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  timezoneIana!: string;
}

export class TechnicalInterviewBookingSummaryDto {
  @ApiProperty({ format: 'email' })
  confirmedEmail!: string;

  @ApiProperty()
  slotStartIsoUtc!: string;

  @ApiProperty()
  timezoneIana!: string;

  @ApiPropertyOptional({ nullable: true })
  lastBolnaExecutionId!: string | null;
}

/** Candidate-visible eligibility + slots + existing booking. */
export class TechnicalInterviewStateDto {
  @ApiProperty()
  eligible!: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Present when eligible is false' })
  ineligibleReason!: string | null;

  @ApiProperty({ description: 'Same bar as screening pass (`SCREENING_PASS_THRESHOLD`, 0–1).' })
  passThreshold!: number;

  @ApiPropertyOptional({ nullable: true })
  screeningScore!: number | null;

  @ApiProperty()
  pipelinePhase!: string;

  @ApiProperty({ type: [String], description: 'UTC ISO instants you may offer or confirm against.' })
  availableSlotStartsUtc!: string[];

  @ApiPropertyOptional({ type: TechnicalInterviewBookingSummaryDto, nullable: true })
  booking!: TechnicalInterviewBookingSummaryDto | null;
}

export class ConfirmTechnicalInterviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ type: TechnicalInterviewBookingSummaryDto })
  booking!: TechnicalInterviewBookingSummaryDto;
}

export class InitiateTechnicalInterviewCallResponseDto {
  @ApiProperty()
  executionId!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;
}
