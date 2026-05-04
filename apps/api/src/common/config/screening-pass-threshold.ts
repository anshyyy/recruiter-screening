import type { ConfigService } from '@nestjs/config';

/** Default 0.7 (70%) — override with `SCREENING_PASS_THRESHOLD` (0–1). */
export const DEFAULT_SCREENING_PASS_THRESHOLD = 0.7;

/**
 * Single source for the screening pass bar used by pipeline transitions and
 * post-screening features (e.g. technical interview scheduling).
 */
export function getScreeningPassThreshold(config: ConfigService): number {
  const v = config.get<string>('SCREENING_PASS_THRESHOLD');
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : DEFAULT_SCREENING_PASS_THRESHOLD;
}
