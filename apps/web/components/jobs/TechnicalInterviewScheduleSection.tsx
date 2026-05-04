'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  fetchTechnicalInterviewState,
  postTechnicalInterviewConfirm,
} from '@/lib/technical-interview-api';
import { COMMON_IANA_TIMEZONE_IDS } from '@/lib/iana-timezone-options';
import type { TechnicalInterviewState } from '@/lib/technical-interview-types';

export type TechnicalInterviewScheduleSectionProps = {
  accessToken: string;
  applicationId: string;
  accountEmail: string;
};

function formatSlotLabel(iso: string, timeZone: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone,
    }).format(d);
  } catch {
    return iso;
  }
}

function mergeTimezoneOptions(preferred: string | undefined): string[] {
  const set = new Set<string>(COMMON_IANA_TIMEZONE_IDS);
  if (preferred && preferred.trim()) {
    set.add(preferred.trim());
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/**
 * Loads eligibility and configurable slots; lets the candidate confirm email, slot, and IANA zone.
 * Business rules stay on the API — this is presentation + calls only.
 */
export function TechnicalInterviewScheduleSection({
  accessToken,
  applicationId,
  accountEmail,
}: TechnicalInterviewScheduleSectionProps) {
  const headingId = useId();
  const formId = useId();
  const [state, setState] = useState<TechnicalInterviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const browserTz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
  const timezoneOptions = useMemo(() => mergeTimezoneOptions(browserTz), [browserTz]);

  const [selectedSlotIso, setSelectedSlotIso] = useState<string>('');
  const [timezoneIana, setTimezoneIana] = useState(() => browserTz ?? 'UTC');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const next = await fetchTechnicalInterviewState(accessToken, applicationId);
      setState(next);
      if (next.availableSlotStartsUtc.length > 0 && !next.booking) {
        setSelectedSlotIso((prev) => prev || next.availableSlotStartsUtc[0]!);
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load scheduling options');
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, applicationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!state?.booking) {
      return;
    }
    setSelectedSlotIso(state.booking.slotStartIsoUtc);
    setTimezoneIana(state.booking.timezoneIana);
  }, [state?.booking?.slotStartIsoUtc, state?.booking?.timezoneIana]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    if (!selectedSlotIso) {
      setSubmitError('Choose a time slot.');
      return;
    }
    setSubmitting(true);
    try {
      await postTechnicalInterviewConfirm(accessToken, {
        applicationId,
        email: accountEmail.trim(),
        slotStartIsoUtc: selectedSlotIso,
        timezoneIana,
      });
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not confirm booking');
    } finally {
      setSubmitting(false);
    }
  };

  const thresholdPct = state ? Math.round(state.passThreshold * 100) : null;

  return (
    <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Technical interview
      </h3>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          <span
            className="inline-block size-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent dark:border-indigo-400"
            aria-hidden
          />
          Checking eligibility…
        </div>
      ) : null}

      {loadError ? (
        <p className="mt-4 text-sm text-red-700 dark:text-red-300" role="alert">
          {loadError}
        </p>
      ) : null}

      {!loading && state ? (
        <div className="mt-4 space-y-4">
          {!state.eligible ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {state.ineligibleReason ??
                `You need to pass AI screening (score at least ${thresholdPct ?? '—'}%) to schedule the next technical interview.`}
            </p>
          ) : state.booking ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
              <p className="font-semibold">Booking confirmed</p>
              <ul className="mt-2 space-y-1 text-emerald-900/90 dark:text-emerald-100/95">
                <li>
                  <span className="text-emerald-800/80 dark:text-emerald-300/90">Email</span>{' '}
                  {state.booking.confirmedEmail}
                </li>
                <li>
                  <span className="text-emerald-800/80 dark:text-emerald-300/90">Start (UTC)</span>{' '}
                  {new Date(state.booking.slotStartIsoUtc).toISOString()}
                </li>
                <li>
                  <span className="text-emerald-800/80 dark:text-emerald-300/90">Your timezone</span>{' '}
                  {state.booking.timezoneIana}
                </li>
                <li>
                  <span className="text-emerald-800/80 dark:text-emerald-300/90">Local time</span>{' '}
                  {formatSlotLabel(state.booking.slotStartIsoUtc, state.booking.timezoneIana)}
                </li>
              </ul>
              <p className="mt-3 text-xs text-emerald-800/90 dark:text-emerald-200/80">
                Need to change the slot? Submit a new choice below — it replaces your previous booking.
              </p>
            </div>
          ) : null}

          {state.eligible && state.availableSlotStartsUtc.length === 0 ? (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Scheduling is not ready yet: no open slots are configured on the server. You can still receive a call from
              us to pick a time.
            </p>
          ) : null}

          {state.eligible && state.availableSlotStartsUtc.length > 0 ? (
            <form id={formId} className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Pass threshold for this role is{' '}
                <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{thresholdPct}%</strong>
                {state.screeningScore != null ? (
                  <>
                    {' '}
                    · Your screening score:{' '}
                    <strong className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {Math.round(state.screeningScore * 100)}%
                    </strong>
                  </>
                ) : null}
              </p>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Pick a start time</legend>
                <ul className="flex flex-col gap-2">
                  {state.availableSlotStartsUtc.map((iso) => (
                    <li key={iso}>
                      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                        <input
                          type="radio"
                          name={`ti-slot-${applicationId}`}
                          value={iso}
                          checked={selectedSlotIso === iso}
                          onChange={() => setSelectedSlotIso(iso)}
                          className="mt-1"
                        />
                        <span className="text-sm text-zinc-800 dark:text-zinc-200">
                          <span className="block font-medium">{formatSlotLabel(iso, timezoneIana)}</span>
                          <span className="block text-xs text-zinc-500 dark:text-zinc-500">{iso}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div>
                <label htmlFor={`${formId}-tz`} className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Time zone (confirmation)
                </label>
                <select
                  id={`${formId}-tz`}
                  value={timezoneIana}
                  onChange={(ev) => setTimezoneIana(ev.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                  We store this with your booking so everyone agrees how to read the start time.
                </p>
              </div>

              <div>
                <label htmlFor={`${formId}-email`} className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Confirm email
                </label>
                <input
                  id={`${formId}-email`}
                  type="email"
                  readOnly
                  value={accountEmail}
                  className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">Must match your account — verified on save.</p>
              </div>

              {submitError ? (
                <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                  {submitError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting || !selectedSlotIso}
                className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                {submitting ? 'Saving…' : state.booking ? 'Update booking' : 'Confirm interview slot'}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
