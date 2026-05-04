'use client';

import { useCallback, type KeyboardEvent } from 'react';

/** One selectable tab in an underline tab strip. */
export type UnderlineTabItem<T extends string = string> = {
  id: T;
  label: string;
};

export type UnderlineTabsProps<T extends string> = {
  /** Stable prefix from `useId()` in the parent so tab buttons and panels share ids. */
  idPrefix: string;
  tabs: readonly UnderlineTabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
};

/**
 * Accessible horizontal tabs with an underline active state (aligned with candidate nav styling).
 */
export function UnderlineTabs<T extends string>({ idPrefix, tabs, value, onChange, ariaLabel }: UnderlineTabsProps<T>) {
  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
        return;
      }
      e.preventDefault();
      const idx = tabs.findIndex((t) => t.id === value);
      if (idx < 0) {
        return;
      }
      let next = idx;
      if (e.key === 'ArrowRight') {
        next = (idx + 1) % tabs.length;
      } else if (e.key === 'ArrowLeft') {
        next = (idx - 1 + tabs.length) % tabs.length;
      } else if (e.key === 'Home') {
        next = 0;
      } else if (e.key === 'End') {
        next = tabs.length - 1;
      }
      onChange(tabs[next]!.id);
    },
    [onChange, tabs, value],
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className="flex min-h-12 items-stretch gap-1 border-b border-zinc-200 dark:border-zinc-800"
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={[
              'inline-flex shrink-0 items-center border-b-2 px-3 py-2.5 text-sm font-medium transition-colors sm:px-4',
              selected
                ? 'border-indigo-600 text-zinc-900 dark:border-indigo-400 dark:text-zinc-50'
                : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
