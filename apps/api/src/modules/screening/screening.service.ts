import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { handleServiceError } from '../../common/utils/service-error';
import { JobApplication } from '../jobs/entities/job-application.entity';
import { ApplicationPipelinePhase } from '../jobs/enums/application-pipeline-phase.enum';
import { UsersService } from '../users/users.service';
import { BolnaClient, type BolnaCallContext } from './bolna.client';
import type { ScreeningSessionView } from './dto/screening-session.dto';
import type {
  ScreeningExtractedData,
  ScreeningTranscriptTurn,
} from './entities/screening-session.entity';
import { ScreeningSession } from './entities/screening-session.entity';
import {
  RETRYABLE_SCREENING_STATUSES,
  ScreeningStatus,
} from './enums/screening-status.enum';

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_PASS_THRESHOLD = 0.7;
const HARD_REJECT_DELTA = 0.2;

@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    @InjectRepository(ScreeningSession)
    private readonly sessionsRepo: Repository<ScreeningSession>,
    @InjectRepository(JobApplication)
    private readonly applicationsRepo: Repository<JobApplication>,
    private readonly bolna: BolnaClient,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  /** Returns the session for an application, creating a PENDING row on first read. */
  async getOrCreateSessionForApplication(
    userId: string,
    applicationId: string,
  ): Promise<ScreeningSessionView> {
    try {
      this.logger.debug(
        `getOrCreateSession: userId=${userId} applicationId=${applicationId}`,
      );
      const application = await this.loadOwnedApplication(userId, applicationId);
      const session = await this.ensureSession(application);
      this.logger.debug(
        `getOrCreateSession: applicationId=${applicationId} sessionId=${session.id} status=${session.status} attempts=${session.attemptCount}`,
      );
      return this.toView(session);
    } catch (error: unknown) {
      handleServiceError(
        this.logger,
        'ScreeningService.getOrCreateSessionForApplication',
        error,
      );
    }
  }

  /** Initiate (or retry) the Bolna call for this application. */
  async startScreening(
    userId: string,
    applicationId: string,
  ): Promise<ScreeningSessionView> {
    try {
      this.logger.log(`startScreening: userId=${userId} applicationId=${applicationId}`);
      const application = await this.loadOwnedApplication(userId, applicationId);

      if (application.pipelinePhase === ApplicationPipelinePhase.REJECTED) {
        this.logger.warn(
          `startScreening: refused — applicationId=${applicationId} is rejected`,
        );
        throw new ConflictException('This application is closed.');
      }
      if (application.pipelinePhase !== ApplicationPipelinePhase.SCREENING) {
        this.logger.warn(
          `startScreening: refused — applicationId=${applicationId} phase=${application.pipelinePhase} (not screening)`,
        );
        throw new ConflictException('Screening has already concluded for this application.');
      }
      const phone = application.phoneNumberSnapshot;
      if (!phone) {
        this.logger.warn(
          `startScreening: refused — applicationId=${applicationId} has no phoneNumberSnapshot`,
        );
        throw new BadRequestException(
          'No phone number on this application. Update your profile and re-apply.',
        );
      }

      const session = await this.ensureSession(application);

      if (
        session.status === ScreeningStatus.INITIATED ||
        session.status === ScreeningStatus.IN_PROGRESS
      ) {
        this.logger.warn(
          `startScreening: refused — sessionId=${session.id} already ${session.status}`,
        );
        throw new ConflictException('A screening call is already in progress.');
      }
      if (session.status === ScreeningStatus.COMPLETED) {
        this.logger.warn(
          `startScreening: refused — sessionId=${session.id} already completed`,
        );
        throw new ConflictException('Screening has already completed for this application.');
      }
      const maxAttempts = this.getMaxAttempts();
      if (session.attemptCount >= maxAttempts) {
        this.logger.warn(
          `startScreening: refused — sessionId=${session.id} attempts=${session.attemptCount}/${maxAttempts}`,
        );
        throw new ConflictException(
          `You have reached the maximum number of screening attempts (${maxAttempts}).`,
        );
      }

      const agentId = this.bolna.getDefaultAgentId();
      if (!agentId) {
        this.logger.error(
          'startScreening: refused — BOLNA_SCREENING_AGENT_ID is not configured',
        );
        throw new ServiceUnavailableException(
          'Screening agent is not configured (BOLNA_SCREENING_AGENT_ID).',
        );
      }

      const candidate = await this.usersService.findById(userId);
      const job = application.job;
      const context: BolnaCallContext = {
        candidateName: candidate?.fullName ?? null,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        skills: application.skillsSnapshot ?? [],
      };

      const { executionId } = await this.bolna.initiateCall({
        agentId,
        recipientPhoneNumber: phone,
        context,
      });

      session.bolnaAgentId = agentId;
      session.bolnaExecutionId = executionId;
      session.status = ScreeningStatus.INITIATED;
      session.initiatedAt = new Date();
      session.attemptCount = (session.attemptCount ?? 0) + 1;
      const saved = await this.sessionsRepo.save(session);
      this.logger.log(
        `startScreening: applicationId=${applicationId} executionId=${executionId} attempt=${saved.attemptCount}`,
      );
      return this.toView(saved);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'ScreeningService.startScreening', error);
    }
  }

  /**
   * Look up the session by Bolna execution id and apply the event.
   * Bolna does not sign webhooks; restrict access at the infra layer
   * (allowlist 13.203.39.153 on your firewall / reverse proxy).
   * Idempotent: replayed event ids are skipped, and stale events (e.g. `in-progress`
   * arriving after `completed`) do not regress the session state.
   */
  async handleWebhook(payload: unknown): Promise<void> {
    try {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        this.logger.warn('handleWebhook: rejected — body is not a JSON object');
        throw new BadRequestException('Webhook body must be a JSON object.');
      }
      const obj = payload as Record<string, unknown>;
      const executionId = pickString(obj, [
        'execution_id',
        'call_id',
        'id',
        'callId',
        'executionId',
      ]);
      if (!executionId) {
        this.logger.warn(
          `handleWebhook: rejected — missing call/execution id. keys=[${Object.keys(obj).join(',')}]`,
        );
        throw new BadRequestException('Webhook payload is missing call/execution id.');
      }

      const session = await this.sessionsRepo.findOne({
        where: { bolnaExecutionId: executionId },
        relations: { application: true },
      });
      if (!session) {
        this.logger.warn(`handleWebhook: no session for executionId=${executionId}`);
        return;
      }

      const eventId = pickString(obj, ['event_id', 'eventId']);
      if (eventId && session.lastWebhookEventId === eventId) {
        this.logger.debug(`handleWebhook: dedupe eventId=${eventId} sessionId=${session.id}`);
        return;
      }

      const eventType = (
        pickString(obj, ['event', 'event_type', 'eventType', 'status']) ?? ''
      )
        .toLowerCase()
        .replace(/-/g, '_');

      this.logger.log(
        `handleWebhook: received executionId=${executionId} sessionId=${session.id} event='${eventType || '(none)'}' currentStatus=${session.status}`,
      );

      if (this.isCompletedTerminal(session.status) && !this.isTerminalEvent(eventType)) {
        this.logger.debug(
          `handleWebhook: ignoring non-terminal event '${eventType}' for already-terminal session ${session.id}`,
        );
        session.lastWebhookPayload = obj;
        if (eventId) session.lastWebhookEventId = eventId;
        await this.sessionsRepo.save(session);
        return;
      }

      session.lastWebhookPayload = obj;
      if (eventId) session.lastWebhookEventId = eventId;

      if (this.isInProgressEvent(eventType)) {
        if (
          session.status === ScreeningStatus.PENDING ||
          session.status === ScreeningStatus.INITIATED
        ) {
          session.status = ScreeningStatus.IN_PROGRESS;
        }
        await this.sessionsRepo.save(session);
        this.logger.log(`handleWebhook: in_progress sessionId=${session.id}`);
        return;
      }

      if (this.isNoAnswerEvent(eventType)) {
        session.status = ScreeningStatus.NO_ANSWER;
        session.completedAt = new Date();
        await this.sessionsRepo.save(session);
        this.logger.log(`handleWebhook: no_answer sessionId=${session.id}`);
        return;
      }

      if (this.isFailureEvent(eventType)) {
        session.status = ScreeningStatus.FAILED;
        session.completedAt = new Date();
        await this.sessionsRepo.save(session);
        this.logger.log(`handleWebhook: failed sessionId=${session.id}`);
        return;
      }

      if (this.isCompletedEvent(eventType)) {
        await this.applyCompletion(session, obj);
        return;
      }

      this.logger.warn(
        `handleWebhook: unrecognized event '${eventType}' for sessionId=${session.id} — payload stored, status unchanged`,
      );
      await this.sessionsRepo.save(session);
    } catch (error: unknown) {
      handleServiceError(this.logger, 'ScreeningService.handleWebhook', error);
    }
  }

  private async applyCompletion(
    session: ScreeningSession,
    payload: Record<string, unknown>,
  ): Promise<void> {
    session.status = ScreeningStatus.COMPLETED;
    session.completedAt = new Date();
    session.recordingUrl = pickString(payload, ['recording_url', 'recordingUrl']) ?? session.recordingUrl;
    session.summary = pickString(payload, ['summary']) ?? session.summary;

    const transcript = parseTranscript(payload);
    if (transcript) {
      session.transcript = transcript;
    }
    const extracted = parseExtractedData(payload);
    if (extracted) {
      session.extractedData = extracted;
    }

    const score = this.computeScore(payload, session.extractedData);
    if (score !== null) {
      session.score = score.toFixed(2);
    }

    await this.sessionsRepo.save(session);

    this.logger.log(
      `applyCompletion: sessionId=${session.id} applicationId=${session.applicationId} ` +
        `transcriptTurns=${transcript?.length ?? 0} extractedKeys=${
          extracted ? Object.keys(extracted).length : 0
        } recordingUrl=${session.recordingUrl ? 'yes' : 'no'} summary=${session.summary ? 'yes' : 'no'} ` +
        `score=${score ?? 'null'}`,
    );

    const nextPhase = this.decidePhase(score);
    if (nextPhase && nextPhase !== session.application.pipelinePhase) {
      await this.applicationsRepo.update(
        { id: session.applicationId },
        { pipelinePhase: nextPhase },
      );
      this.logger.log(
        `applyCompletion: applicationId=${session.applicationId} phase ${session.application.pipelinePhase} → ${nextPhase}`,
      );
    } else {
      this.logger.log(
        `applyCompletion: applicationId=${session.applicationId} phase=${session.application.pipelinePhase} unchanged`,
      );
    }
  }

  private computeScore(
    payload: Record<string, unknown>,
    extracted: ScreeningExtractedData | null,
  ): number | null {
    const direct = pickNumber(payload, ['score', 'fit_score']);
    if (direct !== null) {
      return clamp01(direct);
    }
    if (extracted) {
      const fromExtracted = pickNumber(extracted as Record<string, unknown>, ['score', 'fit_score']);
      if (fromExtracted !== null) {
        return clamp01(fromExtracted);
      }
      const recommendation = pickString(extracted as Record<string, unknown>, [
        'recommendation',
        'decision',
      ])?.toLowerCase();
      if (recommendation === 'pass' || recommendation === 'advance') return 1;
      if (recommendation === 'fail' || recommendation === 'reject') return 0;
    }
    return null;
  }

  private decidePhase(score: number | null): ApplicationPipelinePhase | null {
    if (score === null) {
      return ApplicationPipelinePhase.INTERVIEW;
    }
    const threshold = this.getPassThreshold();
    if (score >= threshold) {
      return ApplicationPipelinePhase.INTERVIEW;
    }
    if (score <= Math.max(0, threshold - HARD_REJECT_DELTA)) {
      return ApplicationPipelinePhase.REJECTED;
    }
    return null;
  }

  // Bolna call statuses use both `-` and `_`; we normalize dashes → underscores before matching.
  private isInProgressEvent(t: string): boolean {
    return [
      'queued',
      'qued',
      'scheduled',
      'initiated',
      'ringing',
      'in_progress',
      'started',
      'call_started',
      'call_initiated',
    ].includes(t);
  }
  private isCompletedEvent(t: string): boolean {
    return [
      'completed',
      'call_ended',
      'call_completed',
      'transcript_ready',
      'transcript_complete',
      'analysis_complete',
    ].includes(t);
  }
  private isNoAnswerEvent(t: string): boolean {
    return ['no_answer', 'busy', 'voicemail', 'not_picked'].includes(t);
  }
  private isFailureEvent(t: string): boolean {
    return ['failed', 'call_failed', 'error'].includes(t);
  }
  private isTerminalEvent(t: string): boolean {
    return this.isCompletedEvent(t) || this.isNoAnswerEvent(t) || this.isFailureEvent(t);
  }
  private isCompletedTerminal(s: ScreeningStatus): boolean {
    return (
      s === ScreeningStatus.COMPLETED ||
      s === ScreeningStatus.NO_ANSWER ||
      s === ScreeningStatus.FAILED ||
      s === ScreeningStatus.CANCELLED
    );
  }

  private getMaxAttempts(): number {
    const v = this.config.get<string>('SCREENING_MAX_ATTEMPTS');
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_ATTEMPTS;
  }
  private getPassThreshold(): number {
    const v = this.config.get<string>('SCREENING_PASS_THRESHOLD');
    const n = v ? Number(v) : NaN;
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_PASS_THRESHOLD;
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

  private async ensureSession(application: JobApplication): Promise<ScreeningSession> {
    const existing = await this.sessionsRepo.findOne({
      where: { applicationId: application.id },
      relations: { application: true },
    });
    if (existing) {
      if (!existing.application) {
        existing.application = application;
      }
      return existing;
    }
    const created = this.sessionsRepo.create({
      applicationId: application.id,
      status: ScreeningStatus.PENDING,
      attemptCount: 0,
    });
    const saved = await this.sessionsRepo.save(created);
    saved.application = application;
    this.logger.log(`ensureSession: created sessionId=${saved.id} for applicationId=${application.id}`);
    return saved;
  }

  private toView(session: ScreeningSession): ScreeningSessionView {
    const maxAttempts = this.getMaxAttempts();
    const canRetry =
      RETRYABLE_SCREENING_STATUSES.includes(session.status) &&
      (session.attemptCount ?? 0) < maxAttempts;
    return {
      id: session.id,
      applicationId: session.applicationId,
      status: session.status,
      attemptCount: session.attemptCount ?? 0,
      canRetry,
      initiatedAt: session.initiatedAt ? session.initiatedAt.toISOString() : null,
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    };
  }
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1 && n <= 100) return n / 100;
  if (n > 1) return 1;
  return n;
}

function parseTranscript(payload: Record<string, unknown>): ScreeningTranscriptTurn[] | null {
  const raw = payload.transcript ?? payload.messages ?? payload.conversation;
  if (!Array.isArray(raw)) return null;
  const turns: ScreeningTranscriptTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const role = normalizeRole(pickString(r, ['role', 'speaker', 'from']));
    const text = pickString(r, ['text', 'content', 'message']);
    if (!role || !text) continue;
    const at = pickString(r, ['at', 'timestamp', 'time']) ?? undefined;
    turns.push({ role, text, at });
  }
  return turns.length > 0 ? turns : null;
}

function normalizeRole(s: string | null): ScreeningTranscriptTurn['role'] | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'agent' || v === 'assistant' || v === 'bot' || v === 'ai') return 'agent';
  if (v === 'candidate' || v === 'user' || v === 'human' || v === 'caller') return 'candidate';
  if (v === 'system') return 'system';
  return null;
}

function parseExtractedData(payload: Record<string, unknown>): ScreeningExtractedData | null {
  const candidates = [
    payload.extracted_data,
    payload.extractedData,
    payload.data_extracted,
    payload.analysis,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      return c as ScreeningExtractedData;
    }
  }
  return null;
}
