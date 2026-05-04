import Link from 'next/link';
import { Children, isValidElement, type ReactNode } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { extractPlainText } from '@/components/docs/markdown-plain-text';
import { MermaidBlock } from '@/components/docs/MermaidBlock';

const linkClass =
  'text-violet-600 underline decoration-violet-500/30 underline-offset-2 transition hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300';

const markdownComponents: Partial<Components> = {
  h1: ({ children }) => (
    <h1 className="mb-4 mt-10 border-b border-zinc-200 pb-3 text-3xl font-semibold tracking-tight text-zinc-900 first:mt-0 dark:border-zinc-800 dark:text-zinc-50">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-10 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-8 text-lg font-semibold text-zinc-900 dark:text-zinc-50">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mb-2 mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-50">{children}</h4>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>,
  a: ({ href, children }) => {
    if (href?.startsWith('/')) {
      return (
        <Link href={href} className={linkClass}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="mb-4 list-disc space-y-1 pl-6 text-zinc-700 dark:text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal space-y-1 pl-6 text-zinc-700 dark:text-zinc-300">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  hr: () => <hr className="my-10 border-zinc-200 dark:border-zinc-800" />,
  blockquote: ({ children }) => (
    <blockquote className="mb-4 border-l-4 border-violet-400 pl-4 italic text-zinc-600 dark:border-violet-600 dark:text-zinc-400">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</strong>,
  table: ({ children }) => (
    <div className="mb-6 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-100 dark:bg-zinc-900/80">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-zinc-200 px-4 py-3 font-semibold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{children}</td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-zinc-200/80 px-1.5 py-0.5 text-sm text-violet-900 dark:bg-zinc-800 dark:text-violet-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    const nodes = Children.toArray(children);
    const first = nodes[0];
    const codeProps =
      isValidElement<{ className?: string; children?: ReactNode }>(first) ? first.props : null;
    if (
      codeProps &&
      typeof codeProps.className === 'string' &&
      codeProps.className.includes('language-mermaid')
    ) {
      const source = extractPlainText(codeProps.children).replace(/\n$/, '');
      return <MermaidBlock chart={source} />;
    }
    return (
      <pre className="mb-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200">
        {children}
      </pre>
    );
  },
};

type MarkdownArticleProps = {
  content: string;
};

/**
 * Renders GitHub-flavored markdown (tables, task lists) with app-consistent typography.
 */
export function MarkdownArticle({ content }: MarkdownArticleProps) {
  return (
    <article className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </article>
  );
}
