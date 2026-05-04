import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobApplication } from '../../jobs/entities/job-application.entity';
import { User } from '../../users/entities/user.entity';

/** Confirmed technical interview slot chosen by the candidate (after passing screening). */
@Entity({ name: 'technical_interview_bookings' })
export class TechnicalInterviewBooking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'application_id', unique: true })
  applicationId!: string;

  @ManyToOne(() => JobApplication, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  application!: JobApplication;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /** Must match the candidate account email at confirmation time (auditable). */
  @Column({ type: 'varchar', length: 320, name: 'confirmed_email' })
  confirmedEmail!: string;

  /** Interview start instant in UTC. */
  @Column({ type: 'timestamptz', name: 'slot_start_utc' })
  slotStartUtc!: Date;

  /** Display / calendar zone the candidate acknowledged (IANA). */
  @Column({ type: 'varchar', length: 64, name: 'timezone_iana' })
  timezoneIana!: string;

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'last_bolna_execution_id' })
  lastBolnaExecutionId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
