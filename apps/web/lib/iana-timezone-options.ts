/**
 * Curated IANA zones for technical-interview confirmation selects.
 * Browser-reported `Intl.DateTimeFormat().resolvedOptions().timeZone` is merged at runtime if missing.
 */
export const COMMON_IANA_TIMEZONE_IDS: readonly string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;
