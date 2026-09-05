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

## Reminder delivery, adapters, scheduler, PWA (second slice)

- **Reminder discovery** (`packages/domain/src/reminders.ts`,
  `discoverReminders`): exact-match `daysUntil === offsetDays` per
  important date, built on `nextOccurrence`/`isInReminderWindow` from the
  first slice. Deliberately exact-match rather than "due or earlier" so a
  skipped run never back-fills a stale reminder for a day that's already
  passed — see `packages/domain/src/__tests__/reminders.test.ts` (6 tests,
  including "does not back-fill a missed earlier offset").
- **Adapters** (`apps/web/src/server/notifications/`): email
  (`console-email-provider` dev fallback, `resend-email-provider` for
  production, selected by whether `EMAIL_PROVIDER_API_KEY` is set) and web
  push (`console-push-provider` fallback, `web-push-provider` using the
  `web-push` npm package and self-generated VAPID keys). Both implement the
  `EmailProvider`/`WebPushProvider` interfaces from `packages/domain/src/notifications.ts`
  and classify permanent vs. transient failures (`SendResult.permanentFailure`)
  so the caller knows whether to retry or give up.
- **Processing** (`apps/web/src/server/outbox/process-reminder-job.ts`):
  loads the `notification_deliveries` row by dedup key, no-ops if it's
  missing or no longer `scheduled` (idempotent re-run), sends via the
  chosen channel, deletes push subscriptions that report a permanent
  failure (expired/unsubscribed), and marks the delivery `sent` or
  `failed`. 7 unit tests against a mocked Supabase client
  (`apps/web/src/server/outbox/__tests__/process-reminder-job.test.ts`).
- **Scheduling**: two Vercel Cron routes (`apps/web/src/app/api/cron/
  discover-reminders`, `.../process-outbox`), both guarded by
  `requireCronSecret` (401 without a matching `Authorization: Bearer
  <CRON_SECRET>` header), wired in `apps/web/vercel.json`.
- **Delivery-history UI**: `NotificationDeliveryList` on the settings page,
  reading the user's own `notification_deliveries` rows through RLS.
- **Cancel-on-edit** (`cancelScheduledDeliveries` in
  `apps/web/src/server/important-dates/actions.ts`): editing an important
  date's month/day/year/timezone cancels its still-`scheduled` delivery
  rows rather than mutating them, so a stale reminder never fires for the
  old date. See `docs/state-transitions.md`.
- **Offline-tolerant PWA**: `apps/web/public/sw.js` (cache-first for
  static assets, network-first-with-offline-fallback for navigation) and
  `public/offline.html`, registered via `ServiceWorkerRegistration` in the
  root layout. `PushSubscribeButton` wires the browser's Push API to a new
  `push_subscriptions` table (migration
  `20260905000100_push_subscriptions.sql`, RLS-scoped to the owning user).

### Verified against the live project (this slice)

Seeded a real important date, ran the discovery→outbox→processing SQL
sequence directly against the live project (this environment's Supabase
connection has no service-role key, so the actual HTTP routes couldn't be
invoked — see `docs/integrations.md` for the exact verification-status
distinction): idempotent double-discovery produced exactly one
`notification_deliveries` row, `claim_outbox_job` atomically claimed it,
marking it `sent` worked, and editing the underlying date cancelled the
still-`scheduled` row without touching an already-`sent` one for the same
date. `push_subscriptions` RLS was verified live the same way Stage 1
verified every other table's RLS. All seeded rows were removed afterward.
The email/web-push adapters themselves ran only against the console/log
fallback here (no Resend key, no real browser push subscription in this
environment) — see `docs/integrations.md`'s per-provider status.

## Production auth bug found and fixed (this slice)

A real user (not a test fixture) signed up against the live project and
reported "the sign-in link takes me back to sign in." Supabase's own
`auth_logs` (queried via `mcp__Supabase__query_logs`) showed `"One-time
token not found"` / `"403: Email link is invalid or has expired"` on
several `/verify` calls for that account, interleaved with at least one
successful login — consistent with something (most likely an email
client's link-scanner, given the Outlook/Hotmail address) consuming the
single-use magic-link token before the user's own click.

Root-causing this also surfaced a real bug in this repo's own code:
`/auth/callback` swallowed every failure into one generic message, and
`/login` never displayed any error at all, so an expired/pre-consumed link
was indistinguishable from "sign-in is broken." Fixed by having
`/auth/callback` forward Supabase's actual `error`/`error_description`
(when `/verify` fails before a code is even issued) or the real
`exchangeCodeForSession` error message, and having `/login` read and
display it as a banner. See `docs/decisions/0007-magic-link-error-surfacing.md`.

This fix is **implemented and tested locally** (typecheck/lint/test/build
all pass) but had not yet been re-verified live against a fresh
link-scanner-affected sign-in attempt at the time this report was written
— see `docs/roadmap.md`'s "Known blockers" for the follow-up needed
(confirm the real user can now complete sign-in; consider a numeric-OTP
fallback if link-scanning turns out to be the dominant cause).

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
- **Dead-lettered reminder jobs don't reconcile delivery status** — if
  every delivery attempt for a reminder transient-fails through the full
  outbox retry backoff, the job is dead-lettered but the corresponding
  `notification_deliveries` row stays `scheduled` forever rather than
  being marked `failed`. Documented as a known gap in
  `docs/state-transitions.md`; reconciling it is Stage 8 admin-console
  territory.
- **No real provider credentials anywhere** — email and web push both run
  against console/log fallbacks only; see `docs/integrations.md` for what
  "verified against the provider" would still require (a Resend key, a
  real browser push subscription).
- No integration/E2E test runner is wired up yet (Playwright or similar);
  coverage so far is unit tests (domain logic) plus manual + live-project
  verification of the query/RLS shapes, not automated browser tests.

## What's next

Only the formal keyboard-navigation/screen-reader pass remains open for
Stage 2's exit gate (soft gap — Master Build Prompt §21 puts the full
audit at Stage 9). Everything else in Stage 2's deliverable list is built
and verified per the taxonomy above. See `docs/roadmap.md` for Stage 3
onward.
