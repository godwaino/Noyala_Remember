/**
 * Centralised locale-aware display formatting for dates/times shown in the
 * UI. Every page here is a React Server Component, so
 * `date.toLocaleDateString()` with no explicit locale runs on the *server*
 * and resolves to the server process's ICU locale — not the visiting
 * user's browser locale. Calling it directly at each call site silently
 * ties every viewer's display to whatever locale the deployment happens to
 * run in, which looks locale-aware in local dev (where server and browser
 * locale usually match) but isn't for a real user elsewhere.
 *
 * Routing every date-display call through here means adding a real
 * per-user locale preference later (e.g. from `profiles` or an
 * `Accept-Language` header) is a change in one place, not a repo-wide
 * find/replace. Until that exists, `DEFAULT_LOCALE` is the single
 * supported locale — this is a foundation, not multi-locale support.
 */

export const DEFAULT_LOCALE = "en-US";

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDate(value: Date | string, locale: string = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleDateString(locale);
}

export function formatDateTime(value: Date | string, locale: string = DEFAULT_LOCALE): string {
  return toDate(value).toLocaleString(locale);
}
