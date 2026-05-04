import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScreeningStatus } from '../enums/screening-status.enum';

/** Candidate-facing view of a screening session (NO transcript, NO score). */
export class ScreeningSessionView {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty({ enum: ScreeningStatus })
  status!: ScreeningStatus;

  @ApiProperty({ description: 'How many call attempts have been made.' })
  attemptCount!: number;

  @ApiProperty({ description: 'Whether the candidate is allowed to start another call.' })
  canRetry!: boolean;

  @ApiPropertyOptional({ nullable: true })
  initiatedAt!: string | null;

  @ApiPropertyOptional({ nullable: true })
  completedAt!: string | null;
}
