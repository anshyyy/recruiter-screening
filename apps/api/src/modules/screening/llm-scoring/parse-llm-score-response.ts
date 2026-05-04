/**
 * Models sometimes wrap JSON in markdown fences or add stray characters — normalize before parse.
 */
export type ParsedLlmScorePayload = {
  score01: number;
  summary: string | null;
  signals: string[] | null;
};

export function parseLlmScoreJson(rawText: string): ParsedLlmScorePayload | null {
  const trimmed = rawText.trim();
  const unfenced = stripMarkdownFence(trimmed);
  const slice = extractFirstJsonObject(unfenced);
  if (!slice) {
    return null;
  }
  try {
    const obj = JSON.parse(slice) as Record<string, unknown>;
    const scoreRaw = obj.score;
    let score01: number;
    if (typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)) {
      score01 = scoreRaw;
    } else if (typeof scoreRaw === 'string') {
      const n = Number(scoreRaw);
      if (!Number.isFinite(n)) return null;
      score01 = n;
    } else {
      return null;
    }
    if (score01 > 1 && score01 <= 10) {
      score01 = score01 / 10;
    } else if (score01 > 1 && score01 <= 100) {
      score01 = score01 / 100;
    }
    score01 = Math.min(1, Math.max(0, score01));

    const summary =
      typeof obj.summary === 'string' && obj.summary.trim().length > 0 ? obj.summary.trim() : null;
    let signals: string[] | null = null;
    if (Array.isArray(obj.signals)) {
      signals = obj.signals.filter((s): s is string => typeof s === 'string' && s.trim().length > 0);
    }

    return { score01, summary, signals: signals && signals.length > 0 ? signals : null };
  } catch {
    return null;
  }
}

function stripMarkdownFence(s: string): string {
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return m ? m[1].trim() : s;
}

function extractFirstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
