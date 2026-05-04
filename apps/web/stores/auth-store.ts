'use client';

import { create } from 'zustand';

const TOKEN_STORAGE_KEY = 'recruiter_screening_access_token';

function readTokenFromStorage(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export type AuthStore = {
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
};

/**
 * Client auth slice: JWT in memory and mirrored to `localStorage` for reloads.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: readTokenFromStorage(),
  setAccessToken: (token) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    set({ accessToken: token });
  },
  clearAccessToken: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    set({ accessToken: null });
  },
}));
