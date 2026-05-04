'use client';

import {
  formatScore01AsPercent,
  parseScreeningExtractedForDisplay,
  type ScreeningExtractedForDisplay,
} from '@/lib/screening-extracted-display';

export type ScreeningExtractedSummaryProps = {
  extractedData: Record<string, unknown> | null;
  /** Prefix for element ids (dialog title id). */
  idPrefix: string;
};

function hasAnyDisplayContent(parsed: ScreeningExtractedForDisplay): boolean {
  const { llm, rubric } = parsed;
  if (llm && (llm.error || llm.summary || llm.score01 != null || llm.signals.length > 0)) {
    return true;
  }
  if (
    rubric &&
    (rubric.combined01 != null ||
      rubric.candidateTurnCount != null ||
      rubric.candidateWordCount != null)
  ) {
    return true;
  }
  return false;
}

/**
 * Plain-language breakdown of AI scoring stored in `extractedData` (no raw JSON).
 */
export function ScreeningExtractedSummary({ extractedData, idPrefix }: ScreeningExtractedSummaryProps) {
  const parsed = parseScreeningExtractedForDisplay(extractedData ?? undefined);

  if (!hasAnyDisplayContent(parsed)) {
    return null;
  }

  const sectionId = `${idPrefix}-extracted-plain`;

  return (
    <div className="mt-6 space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
        AI assessment details
      </p>

      {parsed.llm ? (
        <section
          aria-labelledby={`${sectionId}-llm`}
          className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <h4 id={`${sectionId}-llm`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            AI review of the conversation
          </h4>

          {parsed.llm.error ? (
            <p className="mt-2 text-sm text-red-800 dark:text-red-200" role="alert">
              {parsed.llm.error}
            </p>
          ) : null}

          {!parsed.llm.error && (
            <>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-500">AI review score</dt>
                  <dd className="tabular-nums text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatScore01AsPercent(parsed.llm.score01)}
                  </dd>
                </div>
                {parsed.llm.usedForFinalScore ? (
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Final rating</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200">This AI review was used for the score above.</dd>
                  </div>
                ) : (
                  <div>
                    <dt className="text-zinc-500 dark:text-zinc-500">Final rating</dt>
                    <dd className="text-zinc-600 dark:text-zinc-400">
                      The headline score may use other signals too.
                    </dd>
                  </div>
                )}
              </dl>

              {parsed.llm.summary ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {parsed.llm.summary}
                  </p>
                </div>
              ) : null}

              {parsed.llm.signals.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-500">
                    Key points
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {parsed.llm.signals.map((s, i) => (
                      <li key={`${i}-${s.slice(0, 80)}`}>{s}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {parsed.rubric &&
      (parsed.rubric.combined01 != null ||
        parsed.rubric.candidateTurnCount != null ||
        parsed.rubric.candidateWordCount != null) ? (
        <section
          aria-labelledby={`${sectionId}-rubric`}
          className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <h4 id={`${sectionId}-rubric`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Conversation signals
          </h4>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            A supporting check based on the transcript: job fit, skills mentioned, clarity of the exchange, and how much
            the candidate said.
          </p>
          {parsed.rubric.combined01 != null ? (
            <p className="mt-3 text-sm text-zinc-800 dark:text-zinc-200">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Signals score: </span>
              <span className="tabular-nums font-semibold">{formatScore01AsPercent(parsed.rubric.combined01)}</span>
            </p>
          ) : null}
          {(parsed.rubric.candidateTurnCount != null || parsed.rubric.candidateWordCount != null) && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {parsed.rubric.candidateTurnCount != null ? (
                <>
                  The candidate spoke in approximately{' '}
                  <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                    {parsed.rubric.candidateTurnCount}
                  </span>{' '}
                  turn{parsed.rubric.candidateTurnCount === 1 ? '' : 's'}
                </>
              ) : null}
              {parsed.rubric.candidateTurnCount != null && parsed.rubric.candidateWordCount != null ? ' · ' : null}
              {parsed.rubric.candidateWordCount != null ? (
                <>
                  about{' '}
                  <span className="tabular-nums font-medium text-zinc-800 dark:text-zinc-200">
                    {parsed.rubric.candidateWordCount}
                  </span>{' '}
                  words total
                </>
              ) : null}
              .
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}
