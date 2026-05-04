import type { ScreeningTranscriptTurn } from './entities/screening-session.entity';

/** Persisted under `extracted_data.transcript_derived_rubric` for auditability. */
export type TranscriptDerivedRubricV1 = {
  version: 1;
  candidateTurnCount: number;
  candidateWordCount: number;
  /** 0–1: share of application skill tags found (substring) in candidate speech. */
  skillSignal: number;
  skillsChecked: number;
  skillsMatched: number;
  /** 0–1: enough words to infer substance (saturating curve). */
  verbositySignal: number;
  /** 0–1: enough back-and-forth with the agent. */
  exchangeSignal: number;
  /** 0–1: overlap between job-description keywords and candidate speech. */
  jobRelevanceSignal: number;
  /** Weights used for `combined01` (sum to 1). */
  weights: { skill: number; verbosity: number; exchange: number; job: number };
  /** Weighted combination in [0, 1]. */
  combined01: number;
};

export type DeriveScreeningScoreInput = {
  turns: ScreeningTranscriptTurn[];
  /** From `job_applications.skills_snapshot` at apply time. */
  applicationSkills: string[];
  jobDescription: string;
};

const RUBRIC_VERSION = 1 as const;

/** Minimum candidate words before we emit a score (avoid noisy scores on hang-ups). */
const MIN_CANDIDATE_WORDS = 12;

const STOPWORDS = new Set(
  [
    'able',
    'about',
    'after',
    'also',
    'and',
    'any',
    'are',
    'been',
    'being',
    'both',
    'but',
    'can',
    'could',
    'each',
    'experience',
    'experienced',
    'for',
    'from',
    'had',
    'has',
    'have',
    'including',
    'into',
    'its',
    'lead',
    'leading',
    'like',
    'more',
    'must',
    'not',
    'other',
    'our',
    'prior',
    'review',
    'reviews',
    'role',
    'roles',
    'should',
    'such',
    'team',
    'than',
    'that',
    'the',
    'their',
    'them',
    'then',
    'there',
    'these',
    'they',
    'this',
    'with',
    'will',
    'work',
    'working',
    'years',
    'your',
  ].map((s) => s.toLowerCase()),
);

/**
 * Deterministic screening score from **parsed** transcript + job context only.
 * Does not read vendor JSON blobs or webhook `score` fields.
 */
export function deriveScreeningScoreFromTranscript(
  input: DeriveScreeningScoreInput,
): { score01: number | null; rubric: TranscriptDerivedRubricV1 | null } {
  const candidateTexts = input.turns
    .filter((t) => t.role === 'candidate')
    .map((t) => t.text.trim())
    .filter(Boolean);
  const candidateTurnCount = candidateTexts.length;
  const corpus = candidateTexts.join(' ').toLowerCase();
  const words = corpus.split(/\s+/).filter(Boolean);
  const candidateWordCount = words.length;

  if (candidateWordCount < MIN_CANDIDATE_WORDS || candidateTurnCount < 1) {
    return { score01: null, rubric: null };
  }

  const skillTerms = normalizeSkillTerms(input.applicationSkills);
  const skillsChecked = skillTerms.length;
  let skillsMatched = 0;
  for (const term of skillTerms) {
    if (term.length > 0 && corpus.includes(term)) {
      skillsMatched += 1;
    }
  }
  const skillSignal =
    skillsChecked === 0 ? 1 : Math.min(1, skillsMatched / Math.max(1, skillsChecked));

  const verbositySignal = Math.min(1, candidateWordCount / 140);
  const exchangeSignal = Math.min(1, candidateTurnCount / 7);

  const jobKeywords = extractJobKeywords(input.jobDescription, 48);
  let jobRelevanceSignal: number;
  if (jobKeywords.length === 0) {
    jobRelevanceSignal = 0.55;
  } else {
    const hits = jobKeywords.filter((k) => corpus.includes(k)).length;
    const denom = Math.max(10, Math.ceil(jobKeywords.length * 0.35));
    jobRelevanceSignal = Math.min(1, hits / denom);
  }

  let wSkill: number;
  let wVerb: number;
  let wEx: number;
  let wJob: number;
  if (skillsChecked === 0) {
    wSkill = 0;
    wVerb = 0.45;
    wEx = 0.3;
    wJob = 0.25;
  } else {
    wSkill = 0.35;
    wVerb = 0.3;
    wEx = 0.2;
    wJob = 0.15;
  }

  const combined01 = clamp01(
    wSkill * skillSignal + wVerb * verbositySignal + wEx * exchangeSignal + wJob * jobRelevanceSignal,
  );

  const rubric: TranscriptDerivedRubricV1 = {
    version: RUBRIC_VERSION,
    candidateTurnCount,
    candidateWordCount,
    skillSignal,
    skillsChecked,
    skillsMatched,
    verbositySignal,
    exchangeSignal,
    jobRelevanceSignal,
    weights: { skill: wSkill, verbosity: wVerb, exchange: wEx, job: wJob },
    combined01,
  };

  return { score01: combined01, rubric };
}

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function normalizeSkillTerms(skills: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of skills) {
    for (const part of raw.split(/[,;/]/)) {
      const t = part.trim().toLowerCase();
      if (t.length < 2) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function extractJobKeywords(jobDescription: string, max: number): string[] {
  const lower = jobDescription.toLowerCase();
  const tokens = lower.match(/[a-z][a-z0-9+#.-]{3,}/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tokens) {
    if (STOPWORDS.has(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
