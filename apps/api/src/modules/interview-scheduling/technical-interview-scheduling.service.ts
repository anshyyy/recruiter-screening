import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getScreeningPassThreshold } from '../../common/config/screening-pass-threshold';
import { isValidIanaTimeZone } from '../../common/utils/iana-timezone';
import { handleServiceError } from '../../common/utils/service-error';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { ApplicationPipelinePhase } from '../jobs/enums/application-pipeline-phase.enum';
import { ScreeningSession } from '../screening/entities/screening-session.entity';
import { ScreeningStatus } from '../screening/enums/screening-status.enum';
import { BolnaClient } from '../screening/bolna.client';
import { UsersService } from '../users/users.service';
import type { ConfirmTechnicalInterviewDto } from './dto/technical-interview.dto';
import {
  ConfirmTechnicalInterviewResponseDto,
  InitiateTechnicalInterviewCallResponseDto,
  TechnicalInterviewStateDto,
} from './dto/technical-interview.dto';
import { TechnicalInterviewBooking } from './entities/technical-interview-booking.entity';

/** Parses `TECH_INTERVIEW_AVAILABLE_SLOTS_JSON` — JSON array of UTC ISO-8601 strings. */
const DEFAULT_SLOTS_ENV_KEY = 'TECH_INTERVIEW_AVAILABLE_SLOTS_JSON';
/** How the voice agent should combine Bolna calendar function tools vs static env slots (`TECH_INTERVIEW_SLOT_SOURCE`). */
const DEFAULT_SLOT_SOURCE = 'hybrid';

@Injectable()
export class TechnicalInterviewSchedulingService {
  private readonly logger = new Logger(TechnicalInterviewSchedulingService.name);

  constructor(
    @InjectRepository(TechnicalInterviewBooking)
    private readonly bookingsRepo: Repository<TechnicalInterviewBooking>,
    @InjectRepository(JobApplication)
    private readonly applicationsRepo: Repository<JobApplication>,
    @InjectRepository(ScreeningSession)
    private readonly sessionsRepo: Repository<ScreeningSession>,
    private readonly bolna: BolnaClient,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Candidate: eligibility, configured slots (for self-serve if the call is confusing),
   * and any existing confirmation.
   */
  async getStateForCandidate(
    userId: string,
    applicationId: string,
  ): Promise<TechnicalInterviewStateDto> {
    try {
      const application = await this.loadOwnedApplication(userId, applicationId);
      const session = await this.sessionsRepo.findOne({ where: { applicationId } });
      const threshold = getScreeningPassThreshold(this.config);
      const score01 = session?.score != null ? Number(session.score) : null;
      const eligible = this.isEligibleForTechnicalInterview(application, session, score01, threshold);
      const booking = await this.bookingsRepo.findOne({ where: { applicationId } });

      return {
        eligible,
        ineligibleReason: eligible
          ? null
          : this.describeIneligibility(application, session, score01, threshold),
        passThreshold: threshold,
        screeningScore: score01 !== null && Number.isFinite(score01) ? score01 : null,
        pipelinePhase: application.pipelinePhase,
        availableSlotStartsUtc: this.getConfiguredSlotIsoStrings(),
        booking: booking ? this.toBookingSummary(booking) : null,
      };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'TechnicalInterviewSchedulingService.getStateForCandidate', error);
    }
  }

  /** Candidate: confirm email + slot + timezone (slot must be in configured list). */
  async confirmForCandidate(
    userId: string,
    accountEmail: string,
    dto: ConfirmTechnicalInterviewDto,
  ): Promise<ConfirmTechnicalInterviewResponseDto> {
    try {
      const application = await this.loadOwnedApplication(userId, dto.applicationId);
      const session = await this.sessionsRepo.findOne({ where: { applicationId: dto.applicationId } });
      const threshold = getScreeningPassThreshold(this.config);
      const score01 = session?.score != null ? Number(session.score) : null;

      if (
        !this.isEligibleForTechnicalInterview(application, session, score01, threshold)
      ) {
        throw new ForbiddenException(
          this.describeIneligibility(application, session, score01, threshold) ??
            'Not eligible to schedule a technical interview for this application.',
        );
      }

      const allowed = new Set(this.getConfiguredSlotIsoStrings());
      if (allowed.size === 0) {
        throw new ServiceUnavailableException(
          'No interview time slots are configured yet (set TECH_INTERVIEW_AVAILABLE_SLOTS_JSON on the API).',
        );
      }

      const normalizedSlot = this.normalizeSlotIso(dto.slotStartIsoUtc);
      if (!normalizedSlot || !allowed.has(normalizedSlot)) {
        throw new BadRequestException(
          'Pick one of the UTC slot instants listed in GET /api/technical-interviews/applications/:applicationId/state.',
        );
      }

      const normalizedEmail = this.normalizeEmail(dto.email);
      const normalizedAccount = this.normalizeEmail(accountEmail);
      if (normalizedEmail !== normalizedAccount) {
        throw new BadRequestException('Email must match your signed-in account email.');
      }

      if (!isValidIanaTimeZone(dto.timezoneIana)) {
        throw new BadRequestException('Invalid or unsupported IANA time zone.');
      }

      let booking = await this.bookingsRepo.findOne({ where: { applicationId: dto.applicationId } });
      if (booking) {
        booking.confirmedEmail = normalizedEmail;
        booking.slotStartUtc = new Date(normalizedSlot);
        booking.timezoneIana = dto.timezoneIana.trim();
        booking.userId = userId;
      } else {
        booking = this.bookingsRepo.create({
          applicationId: dto.applicationId,
          userId,
          confirmedEmail: normalizedEmail,
          slotStartUtc: new Date(normalizedSlot),
          timezoneIana: dto.timezoneIana.trim(),
          lastBolnaExecutionId: null,
        });
      }
      const saved = await this.bookingsRepo.save(booking);
      this.logger.log(
        `confirmForCandidate: applicationId=${dto.applicationId} slotUtc=${normalizedSlot} tz=${saved.timezoneIana}`,
      );
      return {
        applicationId: dto.applicationId,
        booking: this.toBookingSummary(saved),
      };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'TechnicalInterviewSchedulingService.confirmForCandidate', error);
    }
  }

  /**
   * Admin: place an outbound Bolna call. Passes `user_data.variables` for the technical
   * interview agent (including `slot_source` and `available_slots_json`). When your Bolna
   * agent has **Calendar Availability** / **Book Appointment** tools, the model should
   * use those for live calendar truth on the call; `available_slots_json` is a fallback
   * or supplement depending on `TECH_INTERVIEW_SLOT_SOURCE`. Web `POST /confirm` still
   * validates only against `TECH_INTERVIEW_AVAILABLE_SLOTS_JSON` unless you add a calendar
   * integration to the API later.
   */
  async initiateSchedulingCallForApplication(
    applicationId: string,
  ): Promise<InitiateTechnicalInterviewCallResponseDto> {
    try {
      const application = await this.applicationsRepo.findOne({
        where: { id: applicationId },
        relations: { job: true, user: true },
      });
      if (!application) {
        throw new NotFoundException('Application not found');
      }
      const session = await this.sessionsRepo.findOne({ where: { applicationId } });
      const threshold = getScreeningPassThreshold(this.config);
      const score01 = session?.score != null ? Number(session.score) : null;
      if (!this.isEligibleForTechnicalInterview(application, session, score01, threshold)) {
        throw new BadRequestException(
          this.describeIneligibility(application, session, score01, threshold) ??
            'Application is not eligible for a technical interview scheduling call.',
        );
      }
      if (!this.bolna.isConfigured()) {
        throw new ServiceUnavailableException('Bolna is not configured (BOLNA_API_KEY, BOLNA_API_BASE_URL).');
      }
      const agentId = this.bolna.getTechnicalInterviewSchedulingAgentId();
      if (!agentId) {
        throw new ServiceUnavailableException(
          'No Bolna agent id for outbound calls. Set BOLNA_SCREENING_AGENT_ID (or BOLNA_TECH_INTERVIEW_SCHEDULING_AGENT_ID for a separate scheduling agent).',
        );
      }
      const candidate = await this.usersService.findById(application.userId);
      const phone =
        application.phoneNumberSnapshot ?? candidate?.phoneNumber ?? null;
      if (!phone) {
        throw new BadRequestException(
          'No phone number on file for this applicant (snapshot or profile).',
        );
      }

      const slotsJson = JSON.stringify(this.getConfiguredSlotIsoStrings());
      const slotSource = this.getTechnicalInterviewSlotSourceForBolna();
      const variables: Record<string, string> = {
        application_id: application.id,
        candidate_name: candidate?.fullName?.trim() || 'Candidate',
        candidate_email: candidate?.email?.trim() ?? '',
        job_title: application.job?.title ?? 'Role',
        company: application.job?.company ?? 'Company',
        pass_threshold: String(threshold),
        /**
         * `hybrid` | `bolna_calendar_tools` | `env_static` — tell the agent how to use
         * Bolna function tools vs the static JSON (see `TECH_INTERVIEW_SLOT_SOURCE`).
         */
        slot_source: slotSource,
        /** Optional fallback/summary when not using only calendar tools. */
        available_slots_json: slotsJson,
      };

      const result = await this.bolna.initiateCallWithVariables({
        agentId,
        recipientPhoneNumber: phone,
        variables,
      });

      this.logger.log(
        `initiateSchedulingCallForApplication: applicationId=${applicationId} executionId=${result.executionId}`,
      );
      return { executionId: result.executionId, applicationId };
    } catch (error: unknown) {
      handleServiceError(
        this.logger,
        'TechnicalInterviewSchedulingService.initiateSchedulingCallForApplication',
        error,
      );
    }
  }

  private isEligibleForTechnicalInterview(
    application: JobApplication,
    session: ScreeningSession | null,
    score01: number | null,
    threshold: number,
  ): boolean {
    if (!session || session.status !== ScreeningStatus.COMPLETED) {
      return false;
    }
    if (application.pipelinePhase !== ApplicationPipelinePhase.INTERVIEW) {
      return false;
    }
    if (score01 === null || !Number.isFinite(score01)) {
      return false;
    }
    return score01 >= threshold;
  }

  private describeIneligibility(
    application: JobApplication,
    session: ScreeningSession | null,
    score01: number | null,
    threshold: number,
  ): string | null {
    if (!session) {
      return 'No screening session exists for this application yet.';
    }
    if (session.status !== ScreeningStatus.COMPLETED) {
      return 'Screening is not completed yet.';
    }
    if (application.pipelinePhase !== ApplicationPipelinePhase.INTERVIEW) {
      return 'This application is not in the interview stage (screening outcome did not advance the pipeline).';
    }
    if (score01 === null || !Number.isFinite(score01)) {
      return 'Screening score is not available yet.';
    }
    if (score01 < threshold) {
      return `Screening score is below the configured pass threshold (${threshold}).`;
    }
    return null;
  }

  private async loadOwnedApplication(
    userId: string,
    applicationId: string,
  ): Promise<JobApplication> {
    const application = await this.applicationsRepo.findOne({
      where: { id: applicationId },
      relations: { job: true },
    });
    if (!application) {
      throw new NotFoundException('Application not found');
    }
    if (application.userId !== userId) {
      throw new ForbiddenException('You cannot access this application.');
    }
    return application;
  }

  /**
   * Drives `slot_source` in Bolna variables so your agent prompt can branch:
   * - `bolna_calendar_tools` — rely on Calendar Availability + Book Appointment tools.
   * - `env_static` — only offer `available_slots_json` (no live calendar on the call).
   * - `hybrid` — prefer calendar tools when the candidate is unsure; env list as backup.
   */
  private getTechnicalInterviewSlotSourceForBolna(): string {
    const raw = this.config.get<string>('TECH_INTERVIEW_SLOT_SOURCE')?.trim().toLowerCase();
    if (
      raw === 'bolna_calendar_tools' ||
      raw === 'env_static' ||
      raw === 'hybrid'
    ) {
      return raw;
    }
    return DEFAULT_SLOT_SOURCE;
  }

  private getConfiguredSlotIsoStrings(): string[] {
    const raw = this.config.get<string>(DEFAULT_SLOTS_ENV_KEY)?.trim();
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        this.logger.warn(`${DEFAULT_SLOTS_ENV_KEY} must be a JSON array of ISO date strings`);
        return [];
      }
      const out: string[] = [];
      for (const item of parsed) {
        if (typeof item !== 'string') {
          continue;
        }
        const iso = this.normalizeSlotIso(item);
        if (iso) {
          out.push(iso);
        }
      }
      return [...new Set(out)].sort();
    } catch {
      this.logger.warn(`${DEFAULT_SLOTS_ENV_KEY} is not valid JSON`);
      return [];
    }
  }

  private normalizeSlotIso(iso: string): string | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return null;
    }
    return d.toISOString();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toBookingSummary(row: TechnicalInterviewBooking) {
    return {
      confirmedEmail: row.confirmedEmail,
      slotStartIsoUtc: row.slotStartUtc.toISOString(),
      timezoneIana: row.timezoneIana,
      lastBolnaExecutionId: row.lastBolnaExecutionId,
    };
  }
}