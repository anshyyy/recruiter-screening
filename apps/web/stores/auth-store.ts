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
  /**
   * Becomes true after a client-only read of `localStorage`, so SSR and the first client
   * render match (both see no token) and avoids hydration mismatches from sync storage reads.
   */
  authHydrated: boolean;
  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
  /** Call once on the client after mount to mirror `localStorage` into the store. */
  hydrateFromStorage: () => void;
};

/**
 * Client auth slice: JWT in memory and mirrored to `localStorage` for reloads.
 * Initial `accessToken` is always `null`; call `hydrateFromStorage` from a root client effect
 * so the first paint matches server HTML.
 */
export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: null,
  authHydrated: false,
  hydrateFromStorage: () => {
    if (typeof window === 'undefined') {
      return;
    }
    set({ accessToken: readTokenFromStorage(), authHydrated: true });
  },
  setAccessToken: (token) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
    set({ accessToken: token, authHydrated: true });
  },
  clearAccessToken: () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    set({ accessToken: null });
  },
}));
