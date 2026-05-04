import type { Metadata } from 'next';
import Link from 'next/link';
import { MarkdownArticle } from '@/components/docs/MarkdownArticle';
import { APP_DISPLAY_NAME } from '@/lib/app-brand';
import { readRepoMarkdownDoc } from '@/lib/repo-docs';

export const metadata: Metadata = {
  title: `Engineering · ${APP_DISPLAY_NAME}`,
  description: 'Engineering documentation: API architecture, modules, and system design',
};

/**
 * Serves `docs/BACKEND_ARCHITECTURE.md` from the monorepo at /docs/Engineering.
 */
export default async function EngineeringDocsPage() {
  const content = await readRepoMarkdownDoc('BACKEND_ARCHITECTURE.md');

  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link
              href="/"
              className="font-medium text-violet-600 transition hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300"
            >
              Home
            </Link>
            <span className="mx-2 text-zinc-400" aria-hidden>
              /
            </span>
            <span className="text-zinc-900 dark:text-zinc-100">Engineering</span>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
        <MarkdownArticle content={content} />
      </main>
    </div>
  );
}
