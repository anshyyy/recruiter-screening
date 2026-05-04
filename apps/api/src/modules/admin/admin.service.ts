import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { handleServiceError } from '../../common/utils/service-error';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { Job } from '../jobs/entities/job.entity';
import { ApplicationPipelinePhase } from '../jobs/enums/application-pipeline-phase.enum';
import type {
  AdminApplicationDetailDto,
  AdminApplicationListItemDto,
  AdminJobListItemDto,
  AdminScreeningDetailDto,
  AdminScreeningSummaryDto,
} from './dto/admin-api.dto';
import { ScreeningSession } from '../screening/entities/screening-session.entity';
import type { ScreeningTranscriptTurn } from '../screening/entities/screening-session.entity';
import { ScreeningStatus } from '../screening/enums/screening-status.enum';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    @InjectRepository(JobApplication)
    private readonly applicationsRepo: Repository<JobApplication>,
    @InjectRepository(ScreeningSession)
    private readonly sessionsRepo: Repository<ScreeningSession>,
  ) {}

  /** Jobs newest first, each with total application count. */
  async listJobsWithApplicationCounts(): Promise<AdminJobListItemDto[]> {
    try {
      const jobs = await this.jobsRepo.find({ order: { createdAt: 'DESC' } });
      if (jobs.length === 0) {
        return [];
      }
      const raw = await this.applicationsRepo
        .createQueryBuilder('a')
        .select('a.job_id', 'jobId')
        .addSelect('COUNT(a.id)', 'cnt')
        .where('a.job_id IN (:...ids)', { ids: jobs.map((j) => j.id) })
        .groupBy('a.job_id')
        .getRawMany<{ jobId: string; cnt: string }>();
      const countByJob = new Map(raw.map((r) => [r.jobId, Number(r.cnt)]));
      return jobs.map((j) => ({
        id: j.id,
        title: j.title,
        company: j.company,
        location: j.location,
        employmentType: j.employmentType,
        createdAt: j.createdAt.toISOString(),
        applicationCount: countByJob.get(j.id) ?? 0,
      }));
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AdminService.listJobsWithApplicationCounts', error);
    }
  }

  /** Applicants for one job with screening summaries (no full transcript). */
  async listApplicationsForJob(jobId: string): Promise<AdminApplicationListItemDto[]> {
    try {
      const job = await this.jobsRepo.findOne({ where: { id: jobId } });
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const apps = await this.applicationsRepo.find({
        where: { jobId },
        relations: { user: true },
        order: { appliedAt: 'DESC' },
      });
      if (apps.length === 0) {
        return [];
      }

      const sessions = await this.sessionsRepo.find({
        where: { applicationId: In(apps.map((a) => a.id)) },
      });
      const sessionByAppId = new Map(sessions.map((s) => [s.applicationId, s]));

      return apps.map((app) =>
        this.toListItem(app, sessionByAppId.get(app.id) ?? undefined),
      );
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AdminService.listApplicationsForJob', error);
    }
  }

  /** Full application + job + screening artifacts for recruiter review. */
  async getApplicationDetail(applicationId: string): Promise<AdminApplicationDetailDto> {
    try {
      const app = await this.applicationsRepo.findOne({
        where: { id: applicationId },
        relations: { user: true, job: true },
      });
      if (!app || !app.job) {
        throw new NotFoundException('Application not found');
      }
      const session = await this.sessionsRepo.findOne({
        where: { applicationId },
      });
      return this.toDetail(app, session ?? undefined);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AdminService.getApplicationDetail', error);
    }
  }

  private toListItem(
    app: JobApplication,
    session: ScreeningSession | undefined,
  ): AdminApplicationListItemDto {
    const user = app.user;
    return {
      applicationId: app.id,
      appliedAt: app.appliedAt.toISOString(),
      pipelinePhase: app.pipelinePhase ?? ApplicationPipelinePhase.SCREENING,
      candidate: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: app.phoneNumberSnapshot ?? user.phoneNumber ?? null,
      },
      submittedSkills: app.skillsSnapshot ?? [],
      submittedResumeFileName: app.resumeFileNameSnapshot,
      screening: this.toScreeningSummary(session),
    };
  }

  private toDetail(app: JobApplication, session: ScreeningSession | undefined): AdminApplicationDetailDto {
    const list = this.toListItem(app, session);
    const job = app.job;
    return {
      ...list,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        employmentType: job.employmentType,
      },
      screening: this.toScreeningDetail(session),
    };
  }

  private toScreeningSummary(session: ScreeningSession | undefined): AdminScreeningSummaryDto {
    if (!session) {
      return {
        sessionId: null,
        status: ScreeningStatus.PENDING,
        attemptCount: 0,
        score: null,
        summary: null,
        initiatedAt: null,
        completedAt: null,
      };
    }
    return {
      sessionId: session.id,
      status: session.status,
      attemptCount: session.attemptCount ?? 0,
      score: parseNumericScore(session.score),
      summary: session.summary,
      initiatedAt: session.initiatedAt ? session.initiatedAt.toISOString() : null,
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    };
  }

  private toScreeningDetail(session: ScreeningSession | undefined): AdminScreeningDetailDto {
    const base = this.toScreeningSummary(session);
    if (!session) {
      return {
        ...base,
        recordingUrl: null,
        extractedData: null,
        transcript: null,
      };
    }
    return {
      ...base,
      recordingUrl: session.recordingUrl,
      extractedData: session.extractedData,
      transcript: normalizeTranscript(session.transcript),
    };
  }
}

function parseNumericScore(raw: string | null): number | null {
  if (raw == null || raw === '') {
    return null;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeTranscript(
  raw: ScreeningTranscriptTurn[] | null,
): { role: string; text: string; at?: string }[] | null {
  if (!raw || raw.length === 0) {
    return null;
  }
  return raw.map((t) => ({
    role: t.role,
    text: t.text,
    ...(t.at ? { at: t.at } : {}),
  }));
}
