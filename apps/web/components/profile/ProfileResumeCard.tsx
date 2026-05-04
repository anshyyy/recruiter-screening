'use client';

import { useRef, useState } from 'react';
import type { AuthUser } from '@/lib/auth-api';
import { patchAuthProfile } from '@/lib/auth-api';
import { requestUploadDelete, requestUploadFile, requestUploadReadUrl } from '@/lib/upload-api';

export type ProfileResumeCardProps = {
  accessToken: string;
  user: AuthUser;
  disabled?: boolean;
  onProfileUpdated: (user: AuthUser) => void;
};

/**
 * PDF upload via `POST /uploads/file`, then PATCH profile with `resumeObjectKey` + `resumeFileName`.
 */
export function ProfileResumeCard({ accessToken, user, disabled, onProfileUpdated }: ProfileResumeCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) {
      return;
    }
    if (file.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { objectKey } = await requestUploadFile(accessToken, file);
      if (user.resumeObjectKey && user.resumeObjectKey !== objectKey) {
        try {
          await requestUploadDelete(accessToken, user.resumeObjectKey);
        } catch {
          /* best-effort: old object may already be gone */
        }
      }
      const updated = await patchAuthProfile(accessToken, {
        resumeObjectKey: objectKey,
        resumeFileName: file.name,
      });
      onProfileUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleViewResume() {
    if (!user.resumeObjectKey) {
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { downloadUrl } = await requestUploadReadUrl(accessToken, user.resumeObjectKey);
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open download link');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveResume() {
    setBusy(true);
    setError(null);
    try {
      if (user.resumeObjectKey) {
        try {
          await requestUploadDelete(accessToken, user.resumeObjectKey);
        } catch {
          /* still clear profile if S3 delete fails (e.g. object already gone) */
        }
      }
      const updated = await patchAuthProfile(accessToken, {
        resumeObjectKey: null,
        resumeFileName: null,
      });
      onProfileUpdated(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove résumé');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => void handleFileChange(e)} />

      {user.resumeFileName ? (
        <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Current résumé</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{user.resumeFileName}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleViewResume()}
                disabled={disabled || busy}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                View PDF
              </button>
              <button
                type="button"
                onClick={() => void handleRemoveResume()}
                disabled={disabled || busy}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No résumé on file yet. Upload a PDF — this file is sent with each application.</p>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy}
        className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-100/80 disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-100 dark:hover:bg-indigo-900/50"
      >
        {busy ? 'Working…' : user.resumeFileName ? 'Replace PDF' : 'Upload PDF résumé'}
      </button>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
