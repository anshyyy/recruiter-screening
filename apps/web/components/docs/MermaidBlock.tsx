'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';

type MermaidBlockProps = {
  /** Raw Mermaid source (flowchart, erDiagram, etc.). */
  chart: string;
};

function subscribePreferredDark(callback: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getPreferredDarkSnapshot(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getPreferredDarkServerSnapshot(): boolean {
  return false;
}

/**
 * Renders Mermaid diagrams client-side (required by Mermaid’s DOM/SVG pipeline).
 * Theme follows `prefers-color-scheme` so diagrams match light/dark docs.
 */
export function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const reactId = useId().replace(/:/g, '');
  const prefersDark = useSyncExternalStore(
    subscribePreferredDark,
    getPreferredDarkSnapshot,
    getPreferredDarkServerSnapshot,
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;
    setError(null);
    el.innerHTML = '';

    void (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: prefersDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const renderId = `mermaid-svg-${reactId}`;
        const { svg } = await mermaid.render(renderId, chart.trim());
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to render Mermaid diagram');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, prefersDark, reactId]);

  if (error) {
    return (
      <div
        className="mb-6 rounded-xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
        role="alert"
      >
        <p className="font-medium">Could not render diagram</p>
        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs">{error}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mb-6 flex min-h-[120px] justify-center overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 [&_svg]:h-auto [&_svg]:max-w-full"
    />
  );
}
