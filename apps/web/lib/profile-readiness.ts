import type { AuthUser } from '@/lib/auth-api';

/** Shown when the user tries to save skills with no valid tags. */
export const SAVE_SKILLS_REQUIRES_ONE_MESSAGE = 'Add at least one skill before saving.';

/** True if the list has at least one non-empty skill string (trimmed). */
export function canSaveProfileSkills(skills: readonly string[]): boolean {
  return skills.some((s) => typeof s === 'string' && s.trim().length > 0);
}

/** True when the candidate can submit applications (skills + résumé + phone on file). */
export function isCandidateApplyReady(user: AuthUser | null | undefined): boolean {
  if (!user) {
    return false;
  }
  const skills = Array.isArray(user.skills) ? user.skills : [];
  return (
    canSaveProfileSkills(skills) &&
    Boolean(user.resumeObjectKey && user.resumeFileName) &&
    Boolean(user.phoneNumber)
  );
}

export function candidateApplyBlockedMessage(user: AuthUser | null | undefined): string {
  if (!user) {
    return 'Sign in to apply.';
  }
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const missing: string[] = [];
  if (!canSaveProfileSkills(skills)) {
    missing.push('at least one skill');
  }
  if (!user.resumeObjectKey || !user.resumeFileName) {
    missing.push('an uploaded résumé');
  }
  if (!user.phoneNumber) {
    missing.push('a phone number');
  }
  return `Complete your profile: add ${missing.join(' and ')} on Profile before applying.`;
}

/** E.164: "+" then 1–15 digits, first digit non-zero. */
const E164_RE = /^\+[1-9]\d{1,14}$/;

export function isValidE164Phone(value: string): boolean {
  return E164_RE.test(value.trim());
}
