import type { AuthUser } from '@/lib/auth-api';

/** True when the candidate can submit applications (skills + résumé on file). */
export function isCandidateApplyReady(user: AuthUser | null | undefined): boolean {
  if (!user) {
    return false;
  }
  const skills = Array.isArray(user.skills) ? user.skills : [];
  return skills.length > 0 && Boolean(user.resumeObjectKey && user.resumeFileName);
}

export function candidateApplyBlockedMessage(user: AuthUser | null | undefined): string {
  if (!user) {
    return 'Sign in to apply.';
  }
  const skills = Array.isArray(user.skills) ? user.skills : [];
  const missing: string[] = [];
  if (skills.length === 0) {
    missing.push('at least one skill');
  }
  if (!user.resumeObjectKey || !user.resumeFileName) {
    missing.push('an uploaded résumé');
  }
  return `Complete your profile: add ${missing.join(' and ')} on Profile before applying.`;
}
