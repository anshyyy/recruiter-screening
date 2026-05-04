'use client';

/**
 * Shared chrome for authenticated candidate flows (jobs, profile).
 */
export type CandidateAppShellProps = {
  /** Shown in the main header row (e.g. back link + title). */
  leadingNav?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Right side of header (actions). */
  actions?: React.ReactNode;
  children: React.ReactNode;
};

export function CandidateAppShell({ leadingNav, title, subtitle, actions, children }: CandidateAppShellProps) {
  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/50 text-zinc-900 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/25 dark:text-zinc-50">
      <header className="sticky top-0 z-20 border-b border-zinc-200/90 bg-white/85 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-950/85">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            {leadingNav ? <div className="flex shrink-0 items-center gap-2">{leadingNav}</div> : null}
            <div className="min-w-0 border-t border-zinc-100 pt-3 sm:border-t-0 sm:pt-0 dark:border-zinc-800">
              <h1 className="truncate text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl dark:text-zinc-50">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-0.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{subtitle}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}
