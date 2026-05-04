import type { LoginRole } from '@/lib/login-types';

export type LoginPayload = {
  email: string;
  password: string;
  role: LoginRole;
};

export type LoginFieldErrors = Partial<Record<'email' | 'password', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation before calling an auth API (replace or extend when backend validates).
 */
export function validateLoginForm(email: string, password: string): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const trimmed = email.trim();

  if (!trimmed) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
}

/**
 * Normalized payload for a future sign-in request.
 */
export function buildLoginPayload(
  email: string,
  password: string,
  role: LoginRole,
): LoginPayload {
  return {
    email: email.trim(),
    password,
    role,
  };
}
