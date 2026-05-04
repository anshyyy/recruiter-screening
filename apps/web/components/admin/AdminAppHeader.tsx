'use client';

import Link from 'next/link';
import { APP_DISPLAY_NAME } from '@/lib/app-brand';

export type AdminAppHeaderProps = {
  actions?: React.ReactNode;
};

/** Top bar for recruiter admin routes (no candidate Jobs/Profile nav). */
export function AdminAppHeader({ actions }: AdminAppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-violet-200/80 bg-white/95 backdrop-blur-sm dark:border-violet-900/50 dark:bg-zinc-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/admin"
            aria-label={`${APP_DISPLAY_NAME} admin`}
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:text-violet-700 dark:text-zinc-50 dark:hover:text-violet-300"
          >
            <span>{APP_DISPLAY_NAME}</span>
            <span className="rounded-md bg-violet-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-violet-900 dark:bg-violet-950/80 dark:text-violet-200">
              Admin
            </span>
          </Link>
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
