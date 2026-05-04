import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleServiceError } from '../../common/utils/service-error';
import { UsersService } from '../users/users.service';
import { JobApplication } from './entities/job-application.entity';
import { ApplicationPipelinePhase } from './enums/application-pipeline-phase.enum';
import { EmploymentType } from './enums/employment-type.enum';
import { JobsService } from './jobs.service';

export type AppliedJobView = {
  applicationId: string;
  appliedAt: Date;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    employmentType: EmploymentType | null;
  };
  /** Skills submitted with this application (snapshot). */
  submittedSkills: string[];
  /** Résumé file name attached to this application. */
  submittedResumeFileName: string | null;
  /** Current stage in the hiring pipeline (candidate-facing). */
  pipelinePhase: ApplicationPipelinePhase;
};

@Injectable()
export class JobApplicationsService {
  private readonly logger = new Logger(JobApplicationsService.name);

  constructor(
    @InjectRepository(JobApplication)
    private readonly applicationsRepo: Repository<JobApplication>,
    private readonly jobsService: JobsService,
    private readonly usersService: UsersService,
  ) {}

  async apply(userId: string, jobId: string): Promise<AppliedJobView> {
    try {
      const job = await this.jobsService.findById(jobId);
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const existing = await this.applicationsRepo.findOne({
        where: { userId, jobId },
      });
      if (existing) {
        throw new ConflictException('You have already applied to this job');
      }

      const applicant = await this.usersService.findById(userId);
      if (!applicant) {
        throw new NotFoundException('User not found');
      }
      const skills = Array.isArray(applicant.skills) ? applicant.skills : [];
      if (skills.length === 0) {
        throw new BadRequestException(
          'Add at least one skill on your profile before applying.',
        );
      }
      if (!applicant.resumeObjectKey || !applicant.resumeFileName) {
        throw new BadRequestException(
          'Upload your résumé on your profile before applying. Applications are sent with your profile résumé.',
        );
      }
      if (!applicant.phoneNumber) {
        throw new BadRequestException(
          'Add a phone number on your profile before applying. The screening agent will call this number.',
        );
      }

      const row = this.applicationsRepo.create({
        userId,
        jobId,
        skillsSnapshot: [...skills],
        resumeObjectKeySnapshot: applicant.resumeObjectKey,
        resumeFileNameSnapshot: applicant.resumeFileName,
        phoneNumberSnapshot: applicant.phoneNumber,
      });
      const saved = await this.applicationsRepo.save(row);
      this.logger.log(
        `apply: created applicationId=${saved.id} userId=${userId} jobId=${jobId}`,
      );
      return this.toAppliedView(
        saved.id,
        saved.appliedAt,
        job,
        saved.skillsSnapshot ?? [],
        saved.resumeFileNameSnapshot,
        saved.pipelinePhase ?? ApplicationPipelinePhase.SCREENING,
      );
    } catch (error: unknown) {
      handleServiceError(this.logger, 'JobApplicationsService.apply', error);
    }
  }

  async findAppliedForUser(userId: string): Promise<AppliedJobView[]> {
    try {
      const rows = await this.applicationsRepo.find({
        where: { userId },
        relations: { job: true },
        order: { appliedAt: 'DESC' },
      });
      this.logger.debug(`findAppliedForUser: userId=${userId} count=${rows.length}`);

      return rows.map((row) => {
        const { job } = row;
        return this.toAppliedView(
          row.id,
          row.appliedAt,
          job,
          row.skillsSnapshot ?? [],
          row.resumeFileNameSnapshot,
          row.pipelinePhase ?? ApplicationPipelinePhase.SCREENING,
        );
      });
    } catch (error: unknown) {
      handleServiceError(this.logger, 'JobApplicationsService.findAppliedForUser', error);
    }
  }

  private toAppliedView(
    applicationId: string,
    appliedAt: Date,
    job: {
      id: string;
      title: string;
      company: string;
      location: string | null;
      employmentType: EmploymentType | null;
    },
    submittedSkills: string[],
    submittedResumeFileName: string | null,
    pipelinePhase: ApplicationPipelinePhase,
  ): AppliedJobView {
    return {
      applicationId,
      appliedAt,
      job: {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        employmentType: job.employmentType,
      },
      submittedSkills,
      submittedResumeFileName,
      pipelinePhase,
    };
  }
}
