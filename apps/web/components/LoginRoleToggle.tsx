'use client';

import type { LoginRole } from '@/lib/login-types';

type LoginRoleToggleProps = {
  value: LoginRole;
  onChange: (role: LoginRole) => void;
  disabled?: boolean;
};

/**
 * Switch between standard user and administrator for sign-up / sign-in flows.
 */
export function LoginRoleToggle({ value, onChange, disabled }: LoginRoleToggleProps) {
  return (
    <div
      className="flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800"
      role="group"
      aria-label="Account type"
    >
      {(['user', 'admin'] as const).map((role) => (
        <button
          key={role}
          type="button"
          disabled={disabled}
          onClick={() => onChange(role)}
          className={[
            'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50',
            value === role
              ? role === 'admin'
                ? 'bg-violet-600 text-white dark:bg-violet-500'
                : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900',
          ].join(' ')}
        >
          {role === 'admin' ? 'Admin' : 'User'}
        </button>
      ))}
    </div>
  );
}
