/** Switch providers by setting `SCREENING_LLM_PROVIDER` — no code changes required. */
export type ScreeningLlmProviderId = 'none' | 'gemini' | 'anthropic' | 'openai';

/** Persisted under `extracted_data.llm_screening` when an LLM scoring attempt runs. */
export type LlmScreeningSnapshot = {
  provider: Exclude<ScreeningLlmProviderId, 'none'>;
  model: string;
  score01: number | null;
  summary: string | null;
  signals: string[] | null;
  /** Whether `score01` was written to `screening_sessions.score`. */
  used_for_final_score: boolean;
  error: string | null;
};
