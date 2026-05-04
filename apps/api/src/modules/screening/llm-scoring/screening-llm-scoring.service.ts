import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ScreeningLlmProviderId, LlmScreeningSnapshot } from './llm-scoring.types';
import { parseLlmScoreJson } from './parse-llm-score-response';
import {
  SCREENING_TRANSCRIPT_SCORE_SYSTEM_PROMPT,
  buildScreeningTranscriptScoreUserPrompt,
  type ScreeningTranscriptScorePromptContext,
} from '../../../common/prompts/screening-transcript-score.prompt';

const LLM_TIMEOUT_MS = 55_000;

/** Defaults when `SCREENING_LLM_MODEL` is unset (override per provider anytime via env). */
const DEFAULT_MODEL: Record<Exclude<ScreeningLlmProviderId, 'none'>, string> = {
  /** Override with `SCREENING_LLM_MODEL` when Google ships new ids. */
  gemini: 'gemini-3.1-pro-preview',
  /** e.g. `claude-3-5-haiku-20241022`, `claude-3-5-sonnet-20241022`. */
  anthropic: 'claude-3-5-sonnet-20241022',
  openai: 'gpt-4o-mini',
};

/**
 * Values people sometimes put in `SCREENING_LLM_MODEL` by mistake (provider name, not API model id).
 */
const INVALID_MODEL_PLACEHOLDERS = new Set([
  'gemini',
  'google',
  'anthropic',
  'claude',
  'openai',
  'chatgpt',
  'gpt',
  'azure',
  'none',
  '',
]);

/**
 * Pluggable screening scorer: pick **Gemini**, **Anthropic**, or **OpenAI** via `SCREENING_LLM_PROVIDER`.
 * Uses HTTPS + official REST APIs so swapping models is env-only.
 */
@Injectable()
export class ScreeningLlmScoringService {
  private readonly logger = new Logger(ScreeningLlmScoringService.name);

  constructor(private readonly config: ConfigService) {}

  getConfiguredProvider(): ScreeningLlmProviderId {
    const raw = this.config.get<string>('SCREENING_LLM_PROVIDER')?.trim().toLowerCase();
    if (raw === 'gemini' || raw === 'anthropic' || raw === 'openai') {
      return raw;
    }
    return 'none';
  }

  /** True when a provider is selected and its API key is present. */
  isConfigured(): boolean {
    const p = this.getConfiguredProvider();
    if (p === 'none') {
      return false;
    }
    return this.getApiKey(p) !== null;
  }

  /**
   * Runs the configured LLM. On parse/network failure, returns a snapshot with `score01: null`
   * so callers can fall back to heuristic scoring.
   */
  async scoreTranscript(ctx: ScreeningTranscriptScorePromptContext): Promise<LlmScreeningSnapshot | null> {
    const provider = this.getConfiguredProvider();
    if (provider === 'none') {
      return null;
    }

    const apiKey = this.getApiKey(provider);
    const model = this.getModel(provider);
    const userPrompt = buildScreeningTranscriptScoreUserPrompt(ctx);

    if (!apiKey) {
      this.logger.warn(
        `scoreTranscript: SCREENING_LLM_PROVIDER=${provider} but API key missing — skipping LLM`,
      );
      return {
        provider,
        model,
        score01: null,
        summary: null,
        signals: null,
        used_for_final_score: false,
        error: `Missing API key for ${provider} (set GOOGLE_API_KEY / GEMINI_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY)`,
      };
    }

    try {
      const rawText =
        provider === 'gemini'
          ? await this.callGemini(apiKey, model, userPrompt)
          : provider === 'anthropic'
            ? await this.callAnthropic(apiKey, model, userPrompt)
            : await this.callOpenAI(apiKey, model, userPrompt);

      const parsed = parseLlmScoreJson(rawText);
      if (!parsed) {
        this.logger.warn(
          `scoreTranscript: failed to parse JSON from ${provider} model=${model} preview=${rawText.slice(0, 200)}`,
        );
        return {
          provider,
          model,
          score01: null,
          summary: null,
          signals: null,
          used_for_final_score: false,
          error: 'Model did not return valid scoring JSON',
        };
      }

      return {
        provider,
        model,
        score01: parsed.score01,
        summary: parsed.summary,
        signals: parsed.signals,
        used_for_final_score: true,
        error: null,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`scoreTranscript: ${provider} failed — ${message}`);
      return {
        provider,
        model,
        score01: null,
        summary: null,
        signals: null,
        used_for_final_score: false,
        error: message,
      };
    }
  }

  private getModel(provider: Exclude<ScreeningLlmProviderId, 'none'>): string {
    const raw = this.config.get<string>('SCREENING_LLM_MODEL')?.trim() ?? '';
    const normalized = normalizeGenerativeModelId(raw);
    const lower = normalized.toLowerCase();
    if (!normalized) {
      return DEFAULT_MODEL[provider];
    }
    if (INVALID_MODEL_PLACEHOLDERS.has(lower)) {
      const fallback = DEFAULT_MODEL[provider];
      this.logger.warn(
        `SCREENING_LLM_MODEL="${raw}" is not a valid API model id (use e.g. gemini-3.1-pro-preview for Gemini). Using "${fallback}".`,
      );
      return fallback;
    }
    return normalized;
  }

  private getApiKey(provider: Exclude<ScreeningLlmProviderId, 'none'>): string | null {
    if (provider === 'gemini') {
      return (
        this.config.get<string>('GOOGLE_API_KEY')?.trim() ||
        this.config.get<string>('GEMINI_API_KEY')?.trim() ||
        null
      );
    }
    if (provider === 'anthropic') {
      return this.config.get<string>('ANTHROPIC_API_KEY')?.trim() || null;
    }
    return this.config.get<string>('OPENAI_API_KEY')?.trim() || null;
  }

  private async callGemini(apiKey: string, model: string, userPrompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const body = {
      systemInstruction: {
        parts: [{ text: SCREENING_TRANSCRIPT_SCORE_SYSTEM_PROMPT }],
      },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
      error?: { message?: string };
    };
    if (json.error?.message) {
      throw new Error(json.error.message);
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Gemini response missing text');
    }
    return text;
  }

  private async callAnthropic(apiKey: string, model: string, userPrompt: string): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0.2,
        system: SCREENING_TRANSCRIPT_SCORE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Anthropic HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const block = json.content?.find((c) => c.type === 'text');
    const text = block?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Anthropic response missing text');
    }
    return text;
  }

  private async callOpenAI(apiKey: string, model: string, userPrompt: string): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SCREENING_TRANSCRIPT_SCORE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`OpenAI HTTP ${res.status}: ${errBody.slice(0, 300)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string') {
      throw new Error('OpenAI response missing content');
    }
    return text;
  }
}

/** Strips `models/` if the value was copied from a full Google resource name. */
function normalizeGenerativeModelId(raw: string): string {
  const s = raw.trim();
  if (!s) {
    return '';
  }
  return s.startsWith('models/') ? s.slice('models/'.length).trim() : s;
}
