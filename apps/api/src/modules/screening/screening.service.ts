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
import { ResumeTextExtractor } from './resume-text.extractor';
import { ScreeningLlmScoringService } from './llm-scoring/screening-llm-scoring.service';
import { deriveScreeningScoreFromTranscript } from './transcript-derived-score';

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
    private readonly resumeTextExtractor: ResumeTextExtractor,
    private readonly screeningLlmScoring: ScreeningLlmScoringService,
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

      // Snapshot is best-effort (older applications may have applied before phone was a profile field).
      // Fall back to the candidate's current profile phone, and backfill the snapshot for consistency.
      const candidate = await this.usersService.findById(userId);
      const phone = application.phoneNumberSnapshot ?? candidate?.phoneNumber ?? null;
      if (!phone) {
        this.logger.warn(
          `startScreening: refused — applicationId=${applicationId} has no phone (snapshot=null, profile=null)`,
        );
        throw new BadRequestException(
          'No phone number on file. Add a phone number to your profile, then start the screening call.',
        );
      }
      if (!application.phoneNumberSnapshot && candidate?.phoneNumber) {
        application.phoneNumberSnapshot = candidate.phoneNumber;
        await this.applicationsRepo.save(application);
        this.logger.log(
          `startScreening: backfilled phoneNumberSnapshot for applicationId=${applicationId}`,
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

      const job = application.job;
      const resumeText = await this.resumeTextExtractor.extract(
        application.resumeObjectKeySnapshot,
      );
      const context: BolnaCallContext = {
        candidateName: candidate?.fullName ?? null,
        jobTitle: job.title,
        company: job.company,
        jobDescription: job.description,
        skills: application.skillsSnapshot ?? [],
        resumeText,
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
        relations: { application: { job: true } },
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

    /** Bolna often nests transcript/recording under `data`, `call`, `execution`, etc. */
    const roots = webhookSearchRoots(payload);

    session.recordingUrl =
      pickStringFromRoots(roots, [
        'recording_url',
        'recordingUrl',
        'recording',
        'call_recording_url',
        'audio_url',
        'media_url',
      ]) ?? session.recordingUrl;

    session.summary =
      pickStringFromRoots(roots, [
        'summary',
        'call_summary',
        'conversation_summary',
        'ai_summary',
        'transcript_summary',
      ]) ?? session.summary;

    const transcript = parseTranscriptFromRoots(roots);
    if (transcript) {
      session.transcript = transcript;
    }
    const extracted = parseExtractedDataFromRoots(roots);

    const application = session.application;
    const scoreBundle = await this.computeScoresFromTranscriptContext({
      transcriptTurns: transcript ?? [],
      application,
      providerExtractedMergeBase: { ...(extracted ?? {}) },
    });

    if (Object.keys(scoreBundle.mergedExtracted).length > 0) {
      session.extractedData = scoreBundle.mergedExtracted;
    }

    const score = scoreBundle.finalScore01;
    if (score !== null) {
      session.score = score.toFixed(2);
    }

    await this.sessionsRepo.save(session);

    if (!transcript?.length && !session.recordingUrl && !session.summary && score === null) {
      this.logger.warn(
        `applyCompletion: little usable content from webhook — check Bolna payload shape. ` +
          `topKeys=[${Object.keys(payload).slice(0, 12).join(',')}]`,
      );
    }

    this.logger.log(
      `applyCompletion: sessionId=${session.id} applicationId=${session.applicationId} ` +
        `transcriptTurns=${transcript?.length ?? 0} extractedKeys=${
          extracted ? Object.keys(extracted).length : 0
        } recordingUrl=${session.recordingUrl ? 'yes' : 'no'} summary=${session.summary ? 'yes' : 'no'} ` +
        `score=${score ?? 'null'}`,
    );

    const phaseAfter = await this.syncPipelinePhaseFromScore(session.applicationId, score);
    this.logger.log(
      `applyCompletion: applicationId=${session.applicationId} pipelinePhase→${phaseAfter}`,
    );
  }

  /**
   * Admin: re-run heuristic + LLM scoring using the **stored** transcript (e.g. after LLM outage or config fix).
   */
  async rescoreScreeningForApplication(applicationId: string): Promise<{
    applicationId: string;
    sessionId: string;
    score: string | null;
    scoreComputed: boolean;
    pipelinePhase: ApplicationPipelinePhase;
  }> {
    try {
      const session = await this.sessionsRepo.findOne({
        where: { applicationId },
        relations: { application: { job: true } },
      });
      if (!session) {
        throw new NotFoundException('No screening session for this application.');
      }
      if (!session.transcript?.length) {
        throw new BadRequestException(
          'Cannot rescore: no transcript stored on this session. Wait for a completed screening call first.',
        );
      }

      const baseExtracted = stripScoringKeysFromExtracted(session.extractedData);
      const scoreBundle = await this.computeScoresFromTranscriptContext({
        transcriptTurns: session.transcript,
        application: session.application,
        providerExtractedMergeBase: baseExtracted,
      });

      session.extractedData = scoreBundle.mergedExtracted;
      if (scoreBundle.finalScore01 !== null) {
        session.score = scoreBundle.finalScore01.toFixed(2);
      } else {
        session.score = null;
      }
      await this.sessionsRepo.save(session);

      const pipelinePhase = await this.syncPipelinePhaseFromScore(applicationId, scoreBundle.finalScore01);
      this.logger.log(
        `rescoreScreeningForApplication: applicationId=${applicationId} sessionId=${session.id} score=${scoreBundle.finalScore01 ?? 'null'} phase=${pipelinePhase}`,
      );

      return {
        applicationId,
        sessionId: session.id,
        score: session.score,
        scoreComputed: scoreBundle.finalScore01 !== null,
        pipelinePhase,
      };
    } catch (error: unknown) {
      handleServiceError(this.logger, 'ScreeningService.rescoreScreeningForApplication', error);
    }
  }

  private async computeScoresFromTranscriptContext(params: {
    transcriptTurns: ScreeningTranscriptTurn[];
    application: JobApplication;
    providerExtractedMergeBase: ScreeningExtractedData;
  }): Promise<{ finalScore01: number | null; mergedExtracted: ScreeningExtractedData }> {
    const jobDescription = params.application.job?.description ?? '';
    const skillsSnapshot = params.application.skillsSnapshot;
    const applicationSkills = Array.isArray(skillsSnapshot) ? skillsSnapshot : [];

    const heuristic = deriveScreeningScoreFromTranscript({
      turns: params.transcriptTurns,
      applicationSkills,
      jobDescription,
    });

    const mergedExtracted: ScreeningExtractedData = { ...params.providerExtractedMergeBase };
    if (heuristic.rubric) {
      mergedExtracted.transcript_derived_rubric = heuristic.rubric;
    }

    let finalScore01 = heuristic.score01;
    const job = params.application.job;
    const hasTranscript = params.transcriptTurns.length > 0;
    const llmSnapshot = hasTranscript
      ? await this.screeningLlmScoring.scoreTranscript({
          jobTitle: job?.title ?? 'Role',
          company: job?.company ?? 'Company',
          jobDescription,
          applicationSkills,
          transcriptTurns: params.transcriptTurns,
        })
      : null;
    if (llmSnapshot) {
      mergedExtracted.llm_screening = llmSnapshot;
      if (llmSnapshot.score01 !== null) {
        finalScore01 = llmSnapshot.score01;
      }
    }

    return { finalScore01, mergedExtracted };
  }

  private async syncPipelinePhaseFromScore(
    applicationId: string,
    score: number | null,
  ): Promise<ApplicationPipelinePhase> {
    const appRow = await this.applicationsRepo.findOne({ where: { id: applicationId } });
    if (!appRow) {
      throw new NotFoundException('Application not found');
    }
    const current = appRow.pipelinePhase ?? ApplicationPipelinePhase.SCREENING;
    const nextPhase = this.decidePhase(score);
    if (nextPhase && nextPhase !== current) {
      await this.applicationsRepo.update({ id: applicationId }, { pipelinePhase: nextPhase });
      return nextPhase;
    }
    return current;
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
      /** Emitted when the PSTN leg hangs up; a later `completed` usually follows with artifacts. */
      'call_disconnected',
      'disconnected',
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
      this.logger.debug(
        `ensureSession: reuse sessionId=${existing.id} applicationId=${application.id} status=${existing.status}`,
      );
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

function pickStringFromRoots(
  roots: Record<string, unknown>[],
  keys: string[],
): string | null {
  for (const r of roots) {
    const s = pickString(r, keys);
    if (s) return s;
  }
  return null;
}

/** Shallow + one-level nested objects Bolna may use for webhook payloads. */
const WEBHOOK_NEST_KEYS = [
  'data',
  'result',
  'call',
  'execution',
  'payload',
  'event_data',
  'event',
  'details',
  'analysis',
  'metadata',
  'response',
  /** Bolna stores `recording_url` here on completed calls. */
  'telephony_data',
] as const;

function webhookSearchRoots(payload: Record<string, unknown>): Record<string, unknown>[] {
  const seen = new Set<Record<string, unknown>>();
  const roots: Record<string, unknown>[] = [];

  const add = (o: Record<string, unknown>) => {
    if (seen.has(o)) return;
    seen.add(o);
    roots.push(o);
  };

  add(payload);
  for (const k of WEBHOOK_NEST_KEYS) {
    const v = payload[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const child = v as Record<string, unknown>;
      add(child);
      for (const k2 of WEBHOOK_NEST_KEYS) {
        const v2 = child[k2];
        if (v2 && typeof v2 === 'object' && !Array.isArray(v2)) {
          add(v2 as Record<string, unknown>);
        }
      }
    }
  }
  return roots;
}

function parseTranscriptFromRoots(
  roots: Record<string, unknown>[],
): ScreeningTranscriptTurn[] | null {
  for (const root of roots) {
    const t = parseTranscript(root);
    if (t && t.length > 0) return t;
  }
  return null;
}

function parseExtractedDataFromRoots(
  roots: Record<string, unknown>[],
): ScreeningExtractedData | null {
  for (const root of roots) {
    const e = parseExtractedData(root);
    if (e && Object.keys(e).length > 0) return e;
  }
  return null;
}

function parseTranscript(payload: Record<string, unknown>): ScreeningTranscriptTurn[] | null {
  const arrayKeys = [
    'transcript',
    'messages',
    'conversation',
    'chat_history',
    'dialogue',
    'turns',
    'utterances',
    'history',
    'call_logs',
  ];

  for (const key of arrayKeys) {
    const raw = payload[key];
    if (Array.isArray(raw)) {
      const turns = mapTranscriptArray(raw);
      if (turns.length > 0) return turns;
    }
  }

  const jsonish = pickString(payload, ['transcript', 'transcript_json']);
  if (jsonish?.trim().startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(jsonish);
      if (Array.isArray(parsed)) {
        const turns = mapTranscriptArray(parsed);
        if (turns.length > 0) return turns;
      }
    } catch {
      /* ignore */
    }
  }

  const textBlob = pickString(payload, [
    'transcript',
    'transcript_text',
    'full_transcript',
    'conversation_text',
    'text',
  ]);
  if (textBlob && textBlob.trim().length > 0) {
    const turns = parseLooseTranscriptString(textBlob);
    if (turns.length > 0) return turns;
  }

  return null;
}

function mapTranscriptArray(raw: unknown[]): ScreeningTranscriptTurn[] {
  const turns: ScreeningTranscriptTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const role = normalizeRole(
      pickString(r, ['role', 'speaker', 'from', 'source', 'voice', 'type']),
    );
    let text = pickString(r, ['text', 'content', 'message', 'utterance', 'value']);
    if (!text && r.message && typeof r.message === 'object') {
      text = pickString(r.message as Record<string, unknown>, ['text', 'content']);
    }
    if (!role || !text) continue;
    const at = pickString(r, ['at', 'timestamp', 'time', 'created_at']) ?? undefined;
    turns.push({ role, text, at });
  }
  return turns;
}

/**
 * Best-effort parse when the provider sends one block of text, e.g.
 * "Agent: Hello\nUser: Hi" or lines prefixed with speaker labels.
 */
function parseLooseTranscriptString(blob: string): ScreeningTranscriptTurn[] {
  const lines = blob.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const turns: ScreeningTranscriptTurn[] = [];
  const labeled = /^((?:agent|assistant|bot|ai|user|candidate|human|caller|customer))\s*:\s*(.+)$/i;

  for (const line of lines) {
    const m = line.match(labeled);
    if (!m) continue;
    const role = normalizeRole(m[1]);
    const text = m[2]?.trim();
    if (role && text) turns.push({ role, text });
  }
  return turns;
}

function normalizeRole(s: string | null): ScreeningTranscriptTurn['role'] | null {
  if (!s) return null;
  const v = s.toLowerCase();
  if (v === 'agent' || v === 'assistant' || v === 'bot' || v === 'ai') return 'agent';
  if (
    v === 'candidate' ||
    v === 'user' ||
    v === 'human' ||
    v === 'caller' ||
    v === 'customer' ||
    v === 'callee'
  ) {
    return 'candidate';
  }
  if (v === 'system') return 'system';
  return null;
}

function parseExtractedData(payload: Record<string, unknown>): ScreeningExtractedData | null {
  const candidates = [
    payload.extracted_data,
    payload.extractedData,
    payload.data_extracted,
    payload.analysis,
    payload.evaluation,
    payload.insights,
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object' && !Array.isArray(c)) {
      return c as ScreeningExtractedData;
    }
  }
  return null;
}

/** Drops our scoring artifacts so a rescore can replace them without losing vendor extraction fields. */
function stripScoringKeysFromExtracted(
  data: ScreeningExtractedData | null | undefined,
): ScreeningExtractedData {
  if (!data) {
    return {};
  }
  const copy: Record<string, unknown> = { ...data };
  delete copy.transcript_derived_rubric;
  delete copy.llm_screening;
  return copy as ScreeningExtractedData;
}
