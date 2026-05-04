'use client';

import Link from 'next/link';
import { CandidatePrimaryNav } from '@/components/layout/CandidatePrimaryNav';
import { APP_DISPLAY_NAME, APP_SHORT_MARK } from '@/lib/app-brand';

export type CandidateAppHeaderProps = {
  actions?: React.ReactNode;
};

/**
 * Sticky top application bar: product identity, primary routes, utilities.
 * Matches common SaaS layout (brand + horizontal nav + toolbar).
 */
export function CandidateAppHeader({ actions }: CandidateAppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-zinc-200 bg-white/95 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 overflow-x-auto sm:gap-8">
          <Link
            href="/jobs"
            aria-label={APP_DISPLAY_NAME}
            className="inline-flex h-14 shrink-0 items-center text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:text-indigo-700 dark:text-zinc-50 dark:hover:text-indigo-300"
          >
            <span aria-hidden className="sm:hidden">
              {APP_SHORT_MARK}
            </span>
            <span aria-hidden className="hidden sm:inline">
              {APP_DISPLAY_NAME}
            </span>
          </Link>
          <CandidatePrimaryNav />
        </div>

        {actions ? (
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <span className="hidden h-6 w-px bg-zinc-200 sm:block dark:bg-zinc-700" aria-hidden />
            <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">{actions}</div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
