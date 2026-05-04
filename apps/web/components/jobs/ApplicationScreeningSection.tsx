'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchScreeningByApplication,
  isScreeningInFlight,
  type ScreeningSessionDto,
  type ScreeningStatus,
  startScreening,
} from '@/lib/screening-api';
import { useAuthStore } from '@/stores/auth-store';

const POLL_INTERVAL_MS = 5_000;

export type ApplicationScreeningSectionProps = {
  applicationId: string;
  /** Visible only when the application is in the screening phase. */
  active: boolean;
};

type FetchState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; session: ScreeningSessionDto }
  | { kind: 'error'; message: string };

/**
 * AI-screening control inside the application progress dialog.
 * Shows a "Start AI screening call" CTA while pending; polls during in-flight calls;
 * shows an under-review message when complete. Candidate never sees transcript or score.
 */
export function ApplicationScreeningSection({ applicationId, active }: ApplicationScreeningSectionProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [state, setState] = useState<FetchState>({ kind: 'idle' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!accessToken) {
      setState({ kind: 'error', message: 'Sign in to start your screening call.' });
      return;
    }
    try {
      const session = await fetchScreeningByApplication(accessToken, applicationId);
      if (cancelledRef.current) return;
      setState({ kind: 'ready', session });
    } catch (e) {
      if (cancelledRef.current) return;
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not load screening status.',
      });
    }
  }, [accessToken, applicationId]);

  useEffect(() => {
    cancelledRef.current = false;
    if (!active) {
      return () => {
        cancelledRef.current = true;
      };
    }
    setState({ kind: 'loading' });
    void load();
    return () => {
      cancelledRef.current = true;
    };
  }, [active, load]);

  useEffect(() => {
    if (!active || state.kind !== 'ready') {
      return;
    }
    if (!isScreeningInFlight(state.session.status)) {
      return;
    }
    const id = window.setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [active, state, load]);

  async function handleStart() {
    if (!accessToken) {
      setActionError('Sign in to start your screening call.');
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      const session = await startScreening(accessToken, applicationId);
      setState({ kind: 'ready', session });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not start screening.');
    } finally {
      setActing(false);
    }
  }

  if (!active) {
    return null;
  }

  return (
    <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">AI screening call</h3>

      {state.kind === 'loading' || state.kind === 'idle' ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading screening status…</p>
      ) : state.kind === 'error' ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              setState({ kind: 'loading' });
              void load();
            }}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <ScreeningStateBody
          session={state.session}
          acting={acting}
          actionError={actionError}
          onStart={() => void handleStart()}
        />
      )}
    </div>
  );
}

function ScreeningStateBody({
  session,
  acting,
  actionError,
  onStart,
}: {
  session: ScreeningSessionDto;
  acting: boolean;
  actionError: string | null;
  onStart: () => void;
}) {
  return (
    <div className="mt-2 space-y-3">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{describeStatus(session.status)}</p>

      {session.status === 'pending' || session.status === 'no_answer' || session.status === 'failed' || session.status === 'cancelled' ? (
        <button
          type="button"
          onClick={onStart}
          disabled={acting || !session.canRetry}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        >
          {acting
            ? 'Starting…'
            : session.attemptCount > 0
              ? 'Try the screening call again'
              : 'Start AI screening call'}
        </button>
      ) : null}

      {!session.canRetry && (session.status === 'no_answer' || session.status === 'failed') ? (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          Maximum attempts reached. The hiring team will reach out if there is a next step.
        </p>
      ) : null}

      {isScreeningInFlight(session.status) ? (
        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="inline-block size-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent dark:border-indigo-400"
            aria-hidden
          />
          Answer the incoming call from our screening number.
        </div>
      ) : null}

      {actionError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {actionError}
        </p>
      ) : null}

      {session.attemptCount > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-500">Attempt {session.attemptCount}.</p>
      ) : null}
    </div>
  );
}

function describeStatus(status: ScreeningStatus): string {
  switch (status) {
    case 'pending':
      return 'When you are ready, start the call. Our AI screener will dial the phone number on your profile.';
    case 'initiated':
      return 'Connecting your call now…';
    case 'in_progress':
      return 'Call in progress.';
    case 'completed':
      return 'Screening complete. Your responses are under review.';
    case 'no_answer':
      return 'We could not reach you. Try again when you are ready to take the call.';
    case 'failed':
      return 'Something went wrong with the call. You can try again.';
    case 'cancelled':
      return 'This screening attempt was cancelled.';
    default:
      return '';
  }
}
