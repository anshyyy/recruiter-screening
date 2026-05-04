/** Lifecycle of one Bolna AI screening call (`screening_sessions.status`). */
export enum ScreeningStatus {
  /** Session row exists; candidate has not yet started the call. */
  PENDING = 'pending',
  /** API has asked Bolna to start the call; awaiting `call_started`. */
  INITIATED = 'initiated',
  /** Bolna reports the call is live with the candidate. */
  IN_PROGRESS = 'in_progress',
  /** Call ended and result has been processed (transcript + score). */
  COMPLETED = 'completed',
  /** Bolna could not reach the candidate (busy / no answer / voicemail). */
  NO_ANSWER = 'no_answer',
  /** Bolna or our processing errored — candidate may retry up to the cap. */
  FAILED = 'failed',
  /** Candidate or admin abandoned this session. */
  CANCELLED = 'cancelled',
}

/** Statuses where it is safe to start a new attempt (after retries cap). */
export const RETRYABLE_SCREENING_STATUSES: readonly ScreeningStatus[] = [
  ScreeningStatus.PENDING,
  ScreeningStatus.NO_ANSWER,
  ScreeningStatus.FAILED,
  ScreeningStatus.CANCELLED,
];
