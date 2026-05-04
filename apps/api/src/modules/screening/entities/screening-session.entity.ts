import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobApplication } from '../../jobs/entities/job-application.entity';
import { ScreeningStatus } from '../enums/screening-status.enum';

/** Structured slots extracted from the conversation (skill confirmations, salary, etc). */
export type ScreeningExtractedData = Record<string, unknown>;

export type ScreeningTranscriptTurn = {
  role: 'agent' | 'candidate' | 'system';
  text: string;
  at?: string;
};

/** One Bolna call attempt for a job application. Unique per application — retries reuse the row. */
@Entity({ name: 'screening_sessions' })
export class ScreeningSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'application_id' })
  applicationId!: string;

  @OneToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: JobApplication;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'bolna_agent_id' })
  bolnaAgentId!: string | null;

  /** Bolna call/execution id; populated after we successfully initiate. Webhook lookup key. */
  @Index({ unique: true, where: '"bolna_execution_id" IS NOT NULL' })
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'bolna_execution_id' })
  bolnaExecutionId!: string | null;

  @Column({
    type: 'varchar',
    length: 24,
    name: 'status',
    default: ScreeningStatus.PENDING,
  })
  status!: ScreeningStatus;

  /** How many times the candidate has tried this screening (incremented when a call is initiated). */
  @Column({ type: 'int', name: 'attempt_count', default: 0 })
  attemptCount!: number;

  @Column({ type: 'timestamptz', nullable: true, name: 'initiated_at' })
  initiatedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 1024, nullable: true, name: 'recording_url' })
  recordingUrl!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'transcript' })
  transcript!: ScreeningTranscriptTurn[] | null;

  @Column({ type: 'text', nullable: true, name: 'summary' })
  summary!: string | null;

  /** 0–1 fit score; null until call completes. */
  @Column({ type: 'numeric', precision: 4, scale: 2, nullable: true, name: 'score' })
  score!: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'extracted_data' })
  extractedData!: ScreeningExtractedData | null;

  /** Most recent webhook body, kept verbatim for audit/debugging. */
  @Column({ type: 'jsonb', nullable: true, name: 'last_webhook_payload' })
  lastWebhookPayload!: unknown | null;

  /** Bolna event id; used to dedupe replayed webhooks. */
  @Column({ type: 'varchar', length: 128, nullable: true, name: 'last_webhook_event_id' })
  lastWebhookEventId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
