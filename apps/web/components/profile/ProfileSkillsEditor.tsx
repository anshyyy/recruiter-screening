'use client';

import { useEffect, useState } from 'react';

export type ProfileSkillsEditorProps = {
  initialSkills: string[];
  disabled?: boolean;
  onSave: (skills: string[]) => Promise<void>;
};

/**
 * Tag-style editor: add skills with the input + button, persist via `onSave`.
 */
export function ProfileSkillsEditor({ initialSkills, disabled, onSave }: ProfileSkillsEditorProps) {
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const skillsFingerprint = initialSkills.join('\u0000');
  useEffect(() => {
    setSkills(initialSkills);
  }, [skillsFingerprint, initialSkills]);

  function addSkill() {
    const t = draft.trim();
    if (!t) {
      return;
    }
    setError(null);
    setSkills((prev) => {
      if (prev.some((s) => s.toLowerCase() === t.toLowerCase())) {
        return prev;
      }
      return [...prev, t];
    });
    setDraft('');
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(skills);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save skills');
    } finally {
      setSaving(false);
    }
  }

  function removeSkill(tag: string) {
    setSkills((prev) => prev.filter((s) => s !== tag));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') {
              ev.preventDefault();
              addSkill();
            }
          }}
          disabled={disabled || saving}
          placeholder="e.g. TypeScript, Product design"
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-indigo-500/0 transition-[box-shadow,border-color] focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/15 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-400/20"
        />
        <button
          type="button"
          onClick={addSkill}
          disabled={disabled || saving}
          className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Add
        </button>
      </div>

      {skills.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li
              key={s}
              className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-950 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-100"
            >
              {s}
              <button
                type="button"
                onClick={() => removeSkill(s)}
                disabled={disabled || saving}
                className="rounded-full p-0.5 text-indigo-700 hover:bg-indigo-200/60 disabled:opacity-50 dark:text-indigo-200 dark:hover:bg-indigo-800/60"
                aria-label={`Remove ${s}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No skills yet — add a few you want recruiters to see.</p>
      )}

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={disabled || saving}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60 dark:bg-indigo-500 dark:hover:bg-indigo-400"
      >
        {saving ? 'Saving…' : 'Save skills'}
      </button>
    </div>
  );
}
