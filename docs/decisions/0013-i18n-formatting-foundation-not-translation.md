# 13. Locale-aware date formatting is a foundation now; full UI translation is deferred

Date: 2026-09-06

## Status

Accepted

## Context

Master Build Prompt Stage 9 asks for an "internationalisation framework,
locale-aware dates and multilingual UI foundations." Auditing the current
codebase found every user-visible date rendered with
`date.toLocaleDateString()`/`.toLocaleString()` and no locale argument,
scattered across five page/component files. Every one of those call sites
is inside a React Server Component, so the call runs in Node on the
server, not in the visitor's browser — the locale it resolves to is the
*server process's* ICU locale, not the visiting user's. In local
development, where the server and the developer's browser usually share a
locale, this looks locale-aware; for a real deployed user it silently
isn't, regardless of their own language/region settings.

Full UI translation (every hardcoded English string routed through a
dictionary, plus at least one second locale's translations) is a much
larger, genuinely product-scoped decision — it needs real translated
copy from someone, not guessed-at strings, and touching every component
to extract its text is exactly the kind of large, speculative
restructuring this project's conventions avoid doing unprompted.

## Decision

Build the foundation, not the translation:

- `apps/web/src/i18n/format.ts` centralises every date/time display
  behind `formatDate`/`formatDateTime`, both taking an explicit
  `locale` parameter that defaults to a single documented
  `DEFAULT_LOCALE` constant. All five previous call sites now go through
  it.
- This does not make the app multi-locale today — `DEFAULT_LOCALE` is
  the only locale in use, same as before. What changes is that adding a
  real per-user locale preference later (from `profiles`, or an
  `Accept-Language` header on first load) is a change in one file
  instead of a find/replace across every page that renders a date.
- Full UI string extraction into a translation dictionary, and adding a
  second real locale, is left as explicit future work — see
  `docs/roadmap.md`'s Stage 9 section. It needs a decision on which
  locales to support and where translated copy comes from, neither of
  which this round can answer on its own.

## Consequences

- Any new date-display code should call `formatDate`/`formatDateTime`
  from `@/i18n/format` rather than `Date.prototype.toLocaleDateString`
  directly, so the single-locale assumption stays in one place.
- `packages/domain/src/dates.ts`'s own internal use of
  `Intl.DateTimeFormat("en-US", …)` in `calendarDateInTimeZone` was
  checked and left as-is — it only extracts numeric year/month/day parts
  for computation, never renders anything a user sees, so the locale
  passed there is inert and does not need to change.
