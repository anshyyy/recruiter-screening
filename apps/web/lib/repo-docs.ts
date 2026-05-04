import { readFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Reads a markdown file from the monorepo `docs/` directory.
 * Resolves paths for both `pnpm dev` from `apps/web` and tooling with cwd at the repo root.
 */
export async function readRepoMarkdownDoc(filename: string): Promise<string> {
  // Monorepo `docs/` lives outside `apps/web`; `turbopackIgnore` avoids bundling the whole repo in traces.
  const candidates = [
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      '..',
      '..',
      'docs',
      filename,
    ),
    path.join(/* turbopackIgnore: true */ process.cwd(), 'docs', filename),
  ];
  let lastError: Error | undefined;
  for (const filePath of candidates) {
    try {
      return await readFile(filePath, 'utf-8');
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw new Error(
    `Could not read repo doc "${filename}" (tried: ${candidates.join(' | ')}). ${lastError?.message ?? ''}`,
  );
}
