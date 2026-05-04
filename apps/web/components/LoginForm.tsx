'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LoginRole } from '@/lib/login-types';
import { buildLoginPayload, validateLoginForm } from '@/lib/login-form';
import { postLogin } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';

type LoginFormProps = {
  /** Called after client-side validation with the payload (wire to your auth API here). */
  onValidSubmit?: (payload: ReturnType<typeof buildLoginPayload>) => void | Promise<void>;
};

/**
 * Email + password sign-in. Defaults to a standard user; admin mode is chosen from the footer link.
 */
export function LoginForm({ onValidSubmit }: LoginFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateLoginForm(email, password);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = buildLoginPayload(email, password, role);
    setIsSubmitting(true);
    try {
      if (onValidSubmit) {
        await onValidSubmit(payload);
      } else {
        const tokens = await postLogin(payload.email, payload.password, payload.role);
        useAuthStore.getState().setAccessToken(tokens.accessToken);
        const nextPath = tokens.user.role === 'admin' ? '/admin' : '/jobs';
        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className={[
        'w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm dark:bg-zinc-950',
        role === 'admin'
          ? 'border-violet-200 dark:border-violet-900/60'
          : 'border-zinc-200 dark:border-zinc-800',
      ].join(' ')}
    >
      <div className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {role === 'admin' ? 'Admin sign in' : 'Sign in'}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {role === 'admin'
            ? 'Use your administrator credentials to manage the organization.'
            : 'Use your work email to access your account.'}
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <div className="space-y-4">
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="you@company.com"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <p id="login-email-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="••••••••"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
            />
            {fieldErrors.password ? (
              <p id="login-password-error" className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
        </div>

        {submitError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200" role="alert">
            {submitError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={[
            'flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60',
            role === 'admin'
              ? 'bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400'
              : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200',
          ].join(' ')}
        >
          {isSubmitting ? 'Signing in…' : role === 'admin' ? 'Sign in as admin' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 flex flex-col items-center gap-4 border-t border-zinc-100 pt-6 text-center text-sm dark:border-zinc-800">
        {role === 'user' ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            Need admin access?{' '}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setRole('admin');
                setSubmitError(null);
              }}
              className="font-semibold text-violet-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-violet-400"
            >
              Sign in as admin
            </button>
          </p>
        ) : (
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setRole('user');
              setSubmitError(null);
            }}
            className="font-medium text-zinc-700 underline-offset-2 hover:underline disabled:opacity-50 dark:text-zinc-300"
          >
            ← Back to user sign in
          </button>
        )}

        <p className="text-zinc-600 dark:text-zinc-400">
          No account?{' '}
          <Link
            href="/register"
            className="font-semibold text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-200"
          >
            Register
          </Link>
        </p>

        <Link href="/" className="font-medium text-zinc-500 underline-offset-4 hover:text-zinc-700 hover:underline dark:hover:text-zinc-300">
          Back to home
        </Link>
      </div>
    </div>
  );
}
