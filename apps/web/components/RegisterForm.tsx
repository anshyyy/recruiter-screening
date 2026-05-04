'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginRoleToggle } from '@/components/LoginRoleToggle';
import type { LoginRole } from '@/lib/login-types';
import { postRegister } from '@/lib/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { buildRegisterPayload, validateRegisterForm } from '@/lib/register-form';

type RegisterFormProps = {
  onRegistered?: () => void | Promise<void>;
};

export function RegisterForm({ onRegistered }: RegisterFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<LoginRole>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const errors = validateRegisterForm(email, password, confirmPassword, fullName);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload = buildRegisterPayload(email, password, fullName, role);
    setIsSubmitting(true);
    try {
      const tokens = await postRegister(payload);
      useAuthStore.getState().setAccessToken(tokens.accessToken);
      if (onRegistered) {
        await onRegistered();
      } else {
        const nextPath = tokens.user.role === 'admin' ? '/admin' : '/jobs';
        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
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
          Create account
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Register with your work email. You can pick User or Admin for this account type.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <LoginRoleToggle value={role} onChange={setRole} disabled={isSubmitting} />

        <div className="space-y-4">
          <div>
            <label htmlFor="register-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Full name <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <input
              id="register-name"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="Ada Lovelace"
              aria-invalid={Boolean(fieldErrors.fullName)}
            />
            {fieldErrors.fullName ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.fullName}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="register-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="you@company.com"
              aria-invalid={Boolean(fieldErrors.email)}
            />
            {fieldErrors.email ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="At least 8 characters"
              aria-invalid={Boolean(fieldErrors.password)}
            />
            {fieldErrors.password ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="register-confirm"
              className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Confirm password
            </label>
            <input
              id="register-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
              placeholder="Repeat password"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
            />
            {fieldErrors.confirmPassword ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.confirmPassword}
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
