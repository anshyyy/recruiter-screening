'use client';

import type { LoginRole } from '@/lib/login-types';
import { isApiSuccess } from '@/lib/api-envelope';
import { getPublicApiBaseUrl } from '@/lib/public-env';
import { readApiBody } from '@/lib/read-api-body';
import { useAuthStore } from '@/stores/auth-store';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: string | null;
  skills: string[];
  resumeObjectKey: string | null;
  resumeFileName: string | null;
  phoneNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  user: AuthUser;
};

function normalizeAuthUser(u: AuthUser): AuthUser {
  return {
    ...u,
    skills: Array.isArray(u.skills) ? u.skills : [],
    resumeObjectKey: u.resumeObjectKey ?? null,
    resumeFileName: u.resumeFileName ?? null,
    phoneNumber: u.phoneNumber ?? null,
  };
}

/** Reads the JWT from Zustand (`useAuthStore`), which mirrors `localStorage`. */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return useAuthStore.getState().accessToken;
}

export function setStoredAccessToken(token: string): void {
  useAuthStore.getState().setAccessToken(token);
}

export function clearStoredAccessToken(): void {
  useAuthStore.getState().clearAccessToken();
}

/**
 * POST `/auth/login` — `role` is sent for future server checks; API currently authenticates by email/password only.
 */
export async function postLogin(email: string, password: string, _role: LoginRole): Promise<AuthTokens> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role: _role }),
  });
  const body = await readApiBody<AuthTokens>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return { ...body.data, user: normalizeAuthUser(body.data.user) };
}

export type RegisterInput = {
  email: string;
  password: string;
  fullName?: string;
  role?: LoginRole;
};

export type UpdateProfileInput = {
  skills?: string[];
  resumeObjectKey?: string | null;
  resumeFileName?: string | null;
  phoneNumber?: string | null;
};

/** PATCH `/auth/me/profile` — skills and/or résumé metadata (after `POST /uploads/file`). */
export async function patchAuthProfile(accessToken: string, body: UpdateProfileInput): Promise<AuthUser> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/auth/me/profile`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const parsed = await readApiBody<AuthUser>(res);
  if (!isApiSuccess(parsed)) {
    throw new Error(parsed.message);
  }
  return normalizeAuthUser(parsed.data);
}

/** GET `/auth/me` — current user from JWT. */
export async function fetchAuthMe(accessToken: string): Promise<AuthUser> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await readApiBody<AuthUser>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return normalizeAuthUser(body.data);
}

export async function postRegister(input: RegisterInput): Promise<AuthTokens> {
  const base = getPublicApiBaseUrl();
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      role: input.role,
    }),
  });
  const body = await readApiBody<AuthTokens>(res);
  if (!isApiSuccess(body)) {
    throw new Error(body.message);
  }
  return { ...body.data, user: normalizeAuthUser(body.data.user) };
}
