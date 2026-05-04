/**
 * Maps persisted `screening.extractedData` (API snake_case) into copy-ready fields for the admin UI.
 * Keeps parsing out of React components.
 */

export type LlmScreeningForDisplay = {
  score01: number | null;
  summary: string | null;
  signals: string[];
  usedForFinalScore: boolean;
  error: string | null;
};

export type TranscriptRubricForDisplay = {
  combined01: number | null;
  candidateTurnCount: number | null;
  candidateWordCount: number | null;
};

export type ScreeningExtractedForDisplay = {
  llm: LlmScreeningForDisplay | null;
  rubric: TranscriptRubricForDisplay | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function readFiniteNumber(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return null;
  }
  return v;
}

function readString(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function readStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return [];
  }
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * Normalizes `extracted_data` blobs from the screening session for human-readable display.
 */
export function parseScreeningExtractedForDisplay(
  extracted: Record<string, unknown> | null | undefined,
): ScreeningExtractedForDisplay {
  if (!extracted || !isRecord(extracted)) {
    return { llm: null, rubric: null };
  }

  const llmRaw = extracted.llm_screening;
  let llm: LlmScreeningForDisplay | null = null;
  if (isRecord(llmRaw)) {
    llm = {
      score01: readFiniteNumber(llmRaw.score01),
      summary: readString(llmRaw.summary),
      signals: readStringArray(llmRaw.signals),
      usedForFinalScore: llmRaw.used_for_final_score === true,
      error: readString(llmRaw.error),
    };
  }

  const rubricRaw = extracted.transcript_derived_rubric;
  let rubric: TranscriptRubricForDisplay | null = null;
  if (isRecord(rubricRaw)) {
    rubric = {
      combined01: readFiniteNumber(rubricRaw.combined01),
      candidateTurnCount: readFiniteNumber(rubricRaw.candidateTurnCount),
      candidateWordCount: readFiniteNumber(rubricRaw.candidateWordCount),
    };
  }

  return { llm, rubric };
}

export function formatScore01AsPercent(score01: number | null): string {
  if (score01 == null) {
    return '—';
  }
  return `${Math.round(score01 * 100)}%`;
}
