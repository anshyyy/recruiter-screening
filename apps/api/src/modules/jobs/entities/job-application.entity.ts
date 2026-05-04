import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ApplicationPipelinePhase } from '../enums/application-pipeline-phase.enum';
import { Job } from './job.entity';

/** One row per user per job they applied to. */
@Entity({ name: 'job_applications' })
@Unique(['userId', 'jobId'])
export class JobApplication {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid', name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  /** Skills copied from the candidate profile at apply time. */
  @Column({ type: 'jsonb', name: 'skills_snapshot', nullable: true })
  skillsSnapshot!: string[] | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'resume_object_key_snapshot' })
  resumeObjectKeySnapshot!: string | null;

  @Column({ type: 'varchar', length: 260, nullable: true, name: 'resume_file_name_snapshot' })
  resumeFileNameSnapshot!: string | null;

  /** Phone number captured at apply time, used to dial the candidate for AI screening. */
  @Column({ type: 'varchar', length: 24, nullable: true, name: 'phone_number_snapshot' })
  phoneNumberSnapshot!: string | null;

  @Column({
    type: 'varchar',
    length: 24,
    name: 'pipeline_phase',
    default: ApplicationPipelinePhase.SCREENING,
  })
  pipelinePhase!: ApplicationPipelinePhase;

  @CreateDateColumn({ name: 'applied_at', type: 'timestamptz' })
  appliedAt!: Date;
}
