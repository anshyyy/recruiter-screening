'use client';

import { useState } from 'react';
import type { AuthUser } from '@/lib/auth-api';
import { patchAuthProfile } from '@/lib/auth-api';
import { isValidE164Phone } from '@/lib/profile-readiness';

export type ProfilePhoneCardProps = {
  accessToken: string;
  user: AuthUser;
  disabled?: boolean;
  onProfileUpdated: (user: AuthUser) => void;
};

/**
 * Phone number editor. The AI screening agent (Bolna) calls this number when the candidate
 * starts a screening round, so we require E.164 format and basic validation.
 */
export function ProfilePhoneCard({ accessToken, user, disabled, onProfileUpdated }: ProfilePhoneCardProps) {
  const [draft, setDraft] = useState(user.phoneNumber ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const trimmed = draft.trim();
  const valid = trimmed.length === 0 || isValidE164Phone(trimmed);
  const dirty = trimmed !== (user.phoneNumber ?? '');

  async function handleSave() {
    if (!valid) {
      setError('Use E.164 format (e.g. +14155550100).');
      return;
    }
    setBusy(true);
    setError(null);
    setOkMessage(null);
    try {
      const next = await patchAuthProfile(accessToken, {
        phoneNumber: trimmed.length === 0 ? null : trimmed,
      });
      onProfileUpdated(next);
      setOkMessage(trimmed.length === 0 ? 'Phone number cleared.' : 'Phone number saved.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save phone number');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Used by the AI screening agent to call you for interviews. Use E.164 format with country code (e.g. <code>+14155550100</code>).
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="tel"
          inputMode="tel"
          value={draft}
          onChange={(ev) => {
            setDraft(ev.target.value);
            setError(null);
            setOkMessage(null);
          }}
          placeholder="+14155550100"
          disabled={disabled || busy}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-[box-shadow,border-color] focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-400/20"
          aria-invalid={!valid}
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={disabled || busy || !dirty || !valid}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {busy ? 'Saving…' : 'Save phone'}
        </button>
      </div>

      {!valid ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Use E.164 format (e.g. +14155550100).
        </p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : okMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-300">{okMessage}</p>
      ) : null}
    </div>
  );
}
