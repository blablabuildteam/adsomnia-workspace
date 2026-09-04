/**
 * Atlassian Cloud API tokens expire after at most one year.
 *
 * The current pilot token was created on 28 Aug 2026 (Coen's Atlassian
 * account, reused for Adsomnia + Harlem Next). Default expiry is therefore
 * 28 Aug 2027. After rotation, set `JIRA_API_TOKEN_EXPIRES_AT=YYYY-MM-DD`.
 */

const JIRA_INSTANCE_PREFIXES = ["JIRA_ADSOMNIA", "JIRA_BTR", "JIRA_HN"] as const;

export const JIRA_API_TOKEN_ISSUED_AT = "2026-08-28";
export const JIRA_API_TOKEN_LIFETIME_YEARS = 1;
export const JIRA_TOKEN_REMINDER_DAYS = 30;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type JiraTokenReminder = {
  expiresOn: string;
  daysRemaining: number;
  expired: boolean;
};

function parseIsoDate(iso: string): Date | null {
  if (!ISO_DATE.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcToday(now: Date): Date {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

function addCalendarYears(date: Date, years: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()),
  );
}

function daysUntil(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function defaultJiraTokenExpiry(): string {
  const issued = parseIsoDate(JIRA_API_TOKEN_ISSUED_AT);
  if (!issued) {
    throw new Error("JIRA_API_TOKEN_ISSUED_AT is not a valid ISO date.");
  }
  return toIsoDate(addCalendarYears(issued, JIRA_API_TOKEN_LIFETIME_YEARS));
}

export function resolveJiraTokenExpiry(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const override = env.JIRA_API_TOKEN_EXPIRES_AT?.trim();
  if (override && parseIsoDate(override)) return override;
  return defaultJiraTokenExpiry();
}

/** Pure date check — used by the server helper and by tests. */
export function evaluateJiraTokenReminder(
  expiresOn: string,
  now: Date = new Date(),
  warningDays: number = JIRA_TOKEN_REMINDER_DAYS,
): JiraTokenReminder | null {
  const expiry = parseIsoDate(expiresOn);
  if (!expiry) return null;

  const daysRemaining = daysUntil(utcToday(now), expiry);
  if (daysRemaining > warningDays) return null;

  return {
    expiresOn,
    daysRemaining,
    expired: daysRemaining < 0,
  };
}

function hasConfiguredJiraToken(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return JIRA_INSTANCE_PREFIXES.some(
    (prefix) =>
      Boolean(env[`${prefix}_HOST`]) &&
      Boolean(env[`${prefix}_EMAIL`]) &&
      Boolean(env[`${prefix}_API_TOKEN`]),
  );
}

/** Leadership reminder when a configured Jira token is within 30 days of expiry. */
export function getJiraTokenReminder(
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): JiraTokenReminder | null {
  if (!hasConfiguredJiraToken(env)) return null;
  return evaluateJiraTokenReminder(resolveJiraTokenExpiry(env), now);
}
