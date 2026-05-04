'use client';

import { AdminAppHeader } from '@/components/admin/AdminAppHeader';

export type AdminAppShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Layout wrapper for authenticated admin pages. */
export function AdminAppShell({ title, subtitle, actions, children }: AdminAppShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <AdminAppHeader actions={actions} />

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <header className="mb-8 border-b border-zinc-200 pb-8 dark:border-zinc-800">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">{subtitle}</p>
            ) : null}
          </header>
          {children}
        </div>
      </main>
    </div>
  );
}
