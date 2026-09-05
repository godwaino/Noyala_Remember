# Stage 2 — Relationship core

## Delivered scope

### Deterministic date logic (`packages/domain/src/dates.ts`)
- Timezone-aware via `calendarDateInTimeZone` (native `Intl`, no dependency)
  — everything else operates on whole calendar days, never instants, which
  is what makes it immune to DST shifts.
- `nextOccurrence` handles: unknown birth year (never fabricates one),
  non-recurring one-off dates (returns `null` once passed), and 29
  February — observed on 28 February in non-leap years, a documented
  product decision (`docs/decisions/0003-leap-day-observance-policy.md`).
- `ageAtOccurrence` only ever returns a number when the year is known.
- `resolveUpcoming` / `resolveUpcomingDates` (apps/web) group dates into
  Today/Next 7/Next 30/Later and sort soonest-first.
- `isInReminderWindow` is ready for Stage 2's own future reminder-worker
  wiring and composes with `reminderDeduplicationKey` from Stage 1.
- 22 fixed-clock unit tests: leap-day birthdays (both leap and non-leap
  occurrence years, and the exact-boundary day), unknown years, year
  rollovers including New Year's Eve, a DST-transition date range, and
  non-recurring dates.

### People (`apps/web/src/app/people/`, `src/server/people/`)
- Full CRUD: create, edit, archive/restore (soft, reversible), permanent
  delete (with a confirm dialog and an explicit warning that it cascades).
- List page: search (name/last name/nickname, case-insensitive) and
  relationship-type filter via GET query params, plus a "show archived"
  toggle — all server-rendered, no client-side state.
- Validation via `personInputSchema` (`packages/domain`), shared between
  create and edit.

### Important dates and memories (person detail page)
- Add/edit/delete important dates (birthday/anniversary/custom, optional
  year, per-date reminder offsets and timezone, defaulting to the
  browser's detected zone).
- Add/edit/archive memories (category, sensitivity, optional occurred-on
  date) — sensitivity is surfaced in the UI exactly as stored, ready for
  Stage 3 to actually exclude `sensitive` memories from AI context.
- The detail page resolves each date's next occurrence and age (if known)
  using the domain logic above, per the date's own stored timezone.

### Home and Calendar
- Home shows the single next occurrence across all of a user's people plus
  the full Today/Next 7/Next 30/Later grouping; Calendar shows the full
  grouping as the main view. Both query real Supabase data through the
  RLS-scoped server client — no mock data.

### Export and deletion
- CSV export (`/api/export/people`, `/important-dates`, `/memories`) and
  vCard export (`/api/export/people-vcard`) — all export *all* of the
  user's data (including archived people/memories), unlike the app UI's
  default views, matching a data-portability request rather than a normal
  "browse" filter. CSV/vCard encoding are pure, unit-tested functions in
  `packages/domain` (`csv.ts`, `vcard.ts` — 11 tests).
- Delete-person: implemented (see People above); relies on the
  `ON DELETE CASCADE` foreign keys already in the Stage 1 schema.
- Delete-account: `deleteAccount` server action requires typing "DELETE"
  to confirm, then calls `supabase.auth.admin.deleteUser(user.id)` via the
  service-role client. Every table cascades from `auth.users` or from
  `people` (which itself cascades from `auth.users`), so this one Admin
  API call is sufficient — no per-table cleanup needed. **Not exercised
  against the live project**: this environment's Supabase connection
  doesn't expose the service-role key (same limitation as Stage 1's
  outbox). The cascade behavior itself *was* verified directly (see
  below) by deleting a person and confirming their dates/memories vanish.

## Verification against the live project

Real data was seeded (two people, two important dates including a 29 Feb
one, two memories, one marked sensitive) via the Supabase connection and
exercised with the exact query shapes the app code uses, as the
`authenticated` role with a real RLS-scoped session (not the bypassing
service role):

- Search (`ilike` across first/last/nickname) returned only the matching
  person.
- The dashboard's joined query (`important_dates` + `people`, filtered to
  non-archived people) returned both dates; after archiving one person, a
  re-run correctly excluded their date.
- Deleting a person cascaded away their important dates and memories
  (counts confirmed at 0 afterward) — proving the FK-based cleanup this
  stage relies on for both delete-person and (by extension) delete-account
  actually works, not just that the constraint exists.
- All seeded rows were removed afterward; `get_advisors` (security) shows
  no new findings — same two pre-existing items as Stage 1 (an intentional
  `INFO` on `outbox_jobs`, and the platform's own `rls_auto_enable`
  function, neither introduced by this repo).

No new migrations were needed this stage — Stage 1 already created every
table Stage 2 uses.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean.
- `pnpm -r test` — 63/63 passing (56 in `@noyala/domain`: 22 date-logic +
  18 schema-validation + 7 CSV + 4 vCard + 5 outbox; 7 in `@noyala/web`).
- `pnpm --filter @noyala/web build` — succeeds; every people/dates/
  memories/settings route is correctly dynamic (`ƒ`), static marketing-ish
  pages remain static (`○`).
- Manual smoke test against the live project (production server, real
  anon key): unauthenticated requests to `/people`, `/people/new`,
  `/calendar` redirect to `/login` (307); export routes return 401
  unauthenticated; `/` and `/settings` render their signed-out states
  correctly.

## Known limitations

- **Accessibility**: forms have labels, focus-visible styling carries over
  from Stage 1, and the delete confirmations use the browser's native
  `confirm()` dialog (accessible by default) rather than a custom modal —
  but there has been no formal keyboard-navigation or screen-reader pass.
  Master Build Prompt §21 puts a "WCAG-aligned accessibility audit and
  remediation" at Stage 9 explicitly; this stage's exit gate line about
  "keyboard journeys pass accessibility checks" is only informally met.
- **Delete-account** code path is implemented but not run against the live
  project (see above) — needs the service-role key.
- **Email/web-push reminder adapters** (Stage 2's own deliverable list)
  are **not built yet** — this stage delivered the domain logic they'll
  need (`isInReminderWindow`, the outbox) but not the adapters, the
  scheduler wiring, or delivery-history UI. That's the next slice of
  Stage 2 work.
- **Offline-tolerant PWA behaviour** (Stage 2 deliverable) not addressed —
  no service worker yet.
- No integration/E2E test runner is wired up yet (Playwright or similar);
  coverage so far is unit tests (domain logic) plus manual + live-project
  verification of the query/RLS shapes, not automated browser tests.

## What's next

Reminder adapters + scheduler + delivery history, then offline-tolerant
read paths, complete Stage 2. See `docs/roadmap.md`.
