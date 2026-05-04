'use client';

import { useLayoutEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Loads persisted JWT into Zustand after mount so SSR and the first client render stay aligned.
 * Uses `useLayoutEffect` so hydration completes before child `useEffect` hooks that depend on the token.
 */
export function AuthStoreHydration() {
  const hydrateFromStorage = useAuthStore((s) => s.hydrateFromStorage);

  useLayoutEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return null;
}
