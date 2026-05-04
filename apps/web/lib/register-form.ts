import type { LoginRole } from '@/lib/login-types';

export type RegisterFieldErrors = Partial<
  Record<'email' | 'password' | 'confirmPassword' | 'fullName', string>
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegisterForm(
  email: string,
  password: string,
  confirmPassword: string,
  fullName: string,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const trimmed = email.trim();

  if (!trimmed) {
    errors.email = 'Email is required';
  } else if (!EMAIL_PATTERN.test(trimmed)) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Use at least 8 characters';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  if (fullName.trim().length > 200) {
    errors.fullName = 'Name is too long';
  }

  return errors;
}

export type RegisterPayload = {
  email: string;
  password: string;
  fullName?: string;
  role: LoginRole;
};

export function buildRegisterPayload(
  email: string,
  password: string,
  fullName: string,
  role: LoginRole,
): RegisterPayload {
  const trimmedName = fullName.trim();
  return {
    email: email.trim(),
    password,
    fullName: trimmedName.length > 0 ? trimmedName : undefined,
    role,
  };
}
