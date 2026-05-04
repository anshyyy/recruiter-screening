/**
 * Returns true if `tz` is accepted by the environment's Intl implementation
 * (covers most IANA names like `America/New_York`).
 */
export function isValidIanaTimeZone(tz: string): boolean {
  const s = tz.trim();
  if (!s) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s });
    return true;
  } catch {
    return false;
  }
}
