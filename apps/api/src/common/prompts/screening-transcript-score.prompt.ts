/**
 * Minimal turn shape for LLM transcript formatting.
 * Screening session rows use a compatible type (see `ScreeningTranscriptTurn` in screening module).
 */
export type ScreeningTranscriptTurnForPrompt = {
  role: 'agent' | 'candidate' | 'system';
  text: string;
};

/**
 * Inputs needed to score a screening call transcript against a job.
 * Kept separate from HTTP and LLM transport so prompts stay testable in isolation.
 */
export type ScreeningTranscriptScorePromptContext = {
  jobTitle: string;
  company: string;
  jobDescription: string;
  applicationSkills: string[];
  transcriptTurns: ScreeningTranscriptTurnForPrompt[];
};

/**
 * System prompt: recruiter persona + strict JSON contract + fairness and evidence rules.
 * Tuned for consistent numeric scores and parsable output (see parse-llm-score-response).
 */
export const SCREENING_TRANSCRIPT_SCORE_SYSTEM_PROMPT = `You are an expert technical recruiter scoring a **phone screening** for fit to a specific role.

## What you may use
- The job title, company name, and job description provided in the user message.
- The "Skills snapshot" list (tags from the candidate's application — treat as claims to check against what they *said* on the call, not as proof of ability by itself).
- The **call transcript** (speaker-labeled). This is your primary evidence.

## What you must not do
- Do not invent projects, employers, or credentials that do not appear in the transcript.
- Do not treat politeness, accent, or speed of speech as quality of technical fit; they may matter only for clarity of answers, not as proxies for ability.
- Do not infer protected characteristics; stay on job-relevant substance.

## How to score (single number 0–1: field \`score\`)
Anchor the score using **only** transcript substance versus the role and job description:
- **0.00–0.25**: Almost no relevant signal, refusal to engage, or transcript too thin to assess fit.
- **0.26–0.45**: Weak fit: vague answers, little alignment with required skills or responsibilities.
- **0.46–0.65**: Mixed: some relevant points but shallow, uneven, or missing key areas.
- **0.66–0.82**: Solid: clear examples and reasoning aligned with the role; reasonable depth.
- **0.83–1.00**: Strong: convincing depth, specific experience or problem-solving, strong alignment with the role (use the top band sparingly).

If the candidate barely speaks or the transcript is nearly empty, score **≤ 0.30** and say so in the summary.

## Output format (mandatory)
Respond with **only** one JSON object — no markdown fences, no text before or after. Use this exact shape:
{"score": <number from 0 to 1>, "summary": "<string>", "signals": ["<string>", "..."]}

Field rules:
- **score**: decimal between 0 and 1 inclusive; use two decimals when helpful (e.g. 0.72).
- **summary**: 2–5 sentences in neutral professional tone. State the main basis for the score; note gaps or strengths visible **in the transcript**.
- **signals**: 2–5 short strings: concrete strengths or gaps (e.g. "Explained API design tradeoffs", "No examples for required stack"). No numbering prefixes required.`;

/** Normalize transcript lines for LLM consumption (stable label format). */
export function formatTranscriptForLlm(turns: ScreeningTranscriptTurnForPrompt[]): string {
  const lines: string[] = [];
  for (const t of turns) {
    const label = t.role === 'candidate' ? 'candidate' : t.role === 'agent' ? 'assistant' : t.role;
    lines.push(`[${label}] ${t.text.trim()}`);
  }
  return lines.join('\n');
}

/**
 * User message: fixed section order and labels so the model separates role context from the transcript.
 */
export function buildScreeningTranscriptScoreUserPrompt(ctx: ScreeningTranscriptScorePromptContext): string {
  const skills =
    ctx.applicationSkills.length > 0 ? ctx.applicationSkills.join(', ') : '(none listed on application)';
  const transcript =
    ctx.transcriptTurns.length > 0
      ? formatTranscriptForLlm(ctx.transcriptTurns)
      : '(empty transcript)';

  const candidateTurns = ctx.transcriptTurns.filter((t) => t.role === 'candidate').length;
  const totalTurns = ctx.transcriptTurns.length;

  return [
    'Task: Score how well this screening conversation supports moving the candidate forward for the role below. Use only the transcript and the materials in this message.',
    '',
    `Role: ${ctx.jobTitle}`,
    `Company: ${ctx.company}`,
    '',
    'Job description:',
    ctx.jobDescription.trim() || '(not provided)',
    '',
    `Skills snapshot from application: ${skills}`,
    '',
    `Transcript stats: ${totalTurns} turns (${candidateTurns} candidate turns).`,
    '',
    'Call transcript:',
    transcript,
  ].join('\n');
}
