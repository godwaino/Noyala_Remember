# Stage 9 — Scale, localisation and launch readiness (partial)

## Scope decision, made before most of this round's work

Stage 9 is "a hardening pass over everything built in 0–8" per
`docs/roadmap.md`'s dependency map — but Stage 8 was explicitly skipped
this round (a product/scope decision, not a technical blocker) and Stage
7's native app was never started. So this pass covers hardening for
Stages 0–7 as they actually exist, and is explicit below about which
Stage 9 deliverables have nothing to harden yet (app-store assets, a
support console's diagnostics) versus which apply regardless (security
review, accessibility, i18n foundations, backups, retention, docs).

Two real actions were deliberately **not** taken despite being
technically available, because they cost real money or risk real
production data — see `docs/disaster-recovery.md` for the full reasoning:
creating a paid Supabase branch (which also can't copy production data,
so wouldn't have proven anything about data restore anyway), and invoking
`restore_project` against the live project as a "drill."

## Delivered

### Security (live-verified against the real Supabase project)

A full-codebase security audit (not a diff review) found and fixed:

- **HIGH — `circle_members` role self-escalation.** Any circle member
  could `UPDATE` their own membership row's `role` to `owner` directly —
  the existing RLS policy scoped *which row* but never *which columns*.
  Fixed with a `BEFORE UPDATE` trigger
  (`circle_members_prevent_identity_change`), not a tighter RLS clause
  (would have needed the same self-referencing-subquery pattern that
  already caused a recursion bug in this table's history). **Verified
  live**: seeded a throwaway user/circle/membership, confirmed the
  self-promotion attempt now raises and is blocked, confirmed
  `linked_person_id` (the column this policy is meant to allow editing)
  still updates fine, cleaned up. See
  `docs/decisions/0015-circle-members-role-immutability-trigger.md`.
- **MEDIUM — cross-tenant reminder cancellation.** `updateImportantDate`
  didn't check whether its RLS-scoped update actually affected a row
  before calling a service-role follow-up write scoped only by
  `important_date_id` — a 0-row RLS-filtered update (wrong owner) fell
  through silently. Fixed by checking the update's returned row count.
  See `docs/decisions/0014-important-date-update-ownership-check.md`.
- **MEDIUM — stored XSS via gift-idea links.** `linkUrl` accepted any URL
  scheme including `javascript:`, rendered as a live `<a href>` for every
  circle member sharing gift planning. Restricted to `http(s)` at both
  the zod schema and render site (`isHttpUrl` in
  `packages/domain/src/gift-planning.ts`).
- **MEDIUM — AI prompt tag-injection.** Memory/custom-instruction text
  interpolated into `<facts>`/`<custom_instruction>` tags wasn't escaped,
  so text containing a literal `</facts>` could forge a fake trusted tag.
  Fixed with `escapeForPromptTags` in the OpenAI provider; added a test
  proving a forged closing/opening tag pair no longer survives as literal
  `<`/`>`.
- **LOW — timing-unsafe cron-secret comparison, wildcard-injection in an
  invitation-email lookup, PII-leak gap in logging.** Fixed
  `requireCronSecret` to use `crypto.timingSafeEqual`, escaped
  `%`/`_` before an `ilike` call in `listMyPendingInvitations`, and added
  an email-shaped-substring scrub to the logger (catches PII arriving in
  a field never meant to carry it, like a caught `Error.message` or a
  provider's raw error body — the exact shape of leak a field-name-only
  redaction list misses).
- **Baseline security headers** added (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
  `Permissions-Policy` denying camera/mic/geolocation, none of which this
  app uses). A real CSP was deliberately not attempted — it would need
  nonce wiring verified page-by-page in a real browser, not guessed at
  blind.
- Supabase security advisors re-checked clean after every fix; the
  remaining advisor items (`rls_auto_enable` — a Supabase-platform event
  trigger, not application code; `accept_circle_invitation`/
  `is_circle_member` SECURITY DEFINER — both intentional and already
  documented; leaked-password-protection — not applicable, passwordless
  auth only) were reviewed and confirmed to need no action, not silently
  ignored.

### Database performance (live-verified)

Supabase's performance advisor had 131 findings across every RLS policy
added since Stage 1. All resolved in one migration, then re-verified via
a second advisor pass:

- **70 `auth_rls_initplan`**: every `auth.uid()`/`auth.email()` call in a
  policy now wrapped as `(select ...)` so Postgres evaluates it once per
  query instead of once per row scanned — zero change in what's
  authorized, confirmed by construction (each merge/wrap is a literal OR
  of the original clauses, matching what Postgres does automatically for
  multiple permissive policies).
- **40 `multiple_permissive_policies`** (8 distinct table/action pairs,
  e.g. `people_select_own` + `people_select_shared_via_circle`) merged
  into one policy per pair.
- **16 `unindexed_foreign_keys`**: covering composite indexes added,
  replacing redundant single-column indexes where one already existed on
  the FK's leading column.
- **5 `unused_index`** (now 18, after the new composite indexes above
  joined them): deliberately left alone — the project is days old with
  negligible traffic, so "unused" reflects an empty stats window, not
  genuinely dead indexes. Revisit once real usage exists.

### Accessibility (live axe-core scan + manual review)

- **Live browser scan** (Playwright + axe-core, WCAG 2 A/AA + 2.1 A/AA
  rule sets) against the only two pages reachable without an
  authenticated session (`/login`, `/`) found one real issue: the brand's
  primary color (`#B5654A`) failed 4.5:1 contrast both as white-on-button
  text (4.26:1) and as `text-primary` on the active nav link's muted-tint
  background (4.27:1). Darkened to `#9A563F` (same hue/saturation, 85%
  lightness) — 5.56:1 and 4.68:1 respectively. Re-scanned clean.
  Everything else requiring a real login session could not be live-tested
  — this environment has no service-role key to mint a session via the
  Auth admin API and no real inbox for the OTP flow; brute-forcing the
  OTP hash in the database was deliberately not attempted (that's an
  auth-bypass technique, not a legitimate test method, even against
  throwaway test data).
- **Manual code review** of every other page/component found and fixed 9
  real issues: an unlabeled `<select>` in the CSV import wizard, an
  unlabeled message-editing `<textarea>`, two dynamic status messages not
  announced to screen readers (missing `role="status"`), and ambiguous
  repeated action text ("Edit"/"Delete"/"Remove"/"Open" etc.) on six
  different list pages — each given a context-carrying `aria-label`
  without changing visible text. Two further issues were found and
  explicitly *not* fixed because the real fix needs a new query join
  (member/share display names aren't fetched at all today, a sighted-user
  gap too, not just an accessibility one) — flagged as follow-up rather
  than patched around.
- Heading hierarchy, form labeling, focus-visible styling, and semantic
  HTML (no div-soup, no un-alt'd images — there are none) were already
  solid everywhere checked.

### Internationalisation foundation

Every date-display call site (`toLocaleDateString`/`toLocaleString` with
no explicit locale) was silently resolving to the **server's** ICU
locale, not the visiting user's — invisible in local dev where they
usually match, real for a deployed user elsewhere. Centralised behind
`apps/web/src/i18n/format.ts` (`formatDate`/`formatDateTime`, explicit
`locale` parameter, single `DEFAULT_LOCALE` today). This is a foundation,
not multi-locale support — full UI string extraction and a second real
locale need translated copy from someone, a real product decision, not
guessed at here. See
`docs/decisions/0013-i18n-formatting-foundation-not-translation.md`.

### Retention

`outbox_jobs` and `notification_deliveries` had no retention policy —
every terminal-state row accumulated forever. `purgeOldRecords`
(`apps/web/src/server/outbox/purge-old-records.ts`) now deletes
`succeeded`/`dead_letter` `outbox_jobs` after 30 days and
`sent`/`failed`/`cancelled` `notification_deliveries` after 365 days
(kept far longer since it backs the account's own delivery-history UI).
Piggybacked on the existing daily `process-outbox` cron rather than a new
schedule. See
`docs/decisions/0016-retention-purge-piggybacked-on-outbox-cron.md`.

### Documentation

- `docs/disaster-recovery.md` — what could and couldn't be verified about
  backup/restore in this environment, and why (see below); RPO/RTO by
  scenario; the actual retention behavior; runbooks for schema-rebuild
  and (separately) real data restore.
- `docs/data-protection.md` — what's genuinely self-service today
  (export, person delete, account delete), the real gap that `consents`
  is schema-ready but has no application code anywhere using it, and the
  manual operational-request process that exists in the absence of a
  Stage 8 support console.
- `docs/production-readiness.md` — rollback criteria, current monitoring
  (and its real gap: no error-monitoring provider configured, so nothing
  pages anyone), and support ownership (none beyond the account owner).
- `docs/launch-plan.md` — app-store assets correctly deferred (no native
  app to screenshot yet), what web launch assets exist versus don't, and
  a staged-rollout plan scaled to this product's actual current size
  (one real user) rather than infrastructure it doesn't need yet.

## What's deliberately not done this round, and why

- **A real backup/restore drill.** `create_branch` can't copy production
  data onto a branch (its own tool description says so), so it can't
  exercise a data restore at all, and it costs real recurring money for a
  drill that wouldn't prove what it's meant to. `restore_project` acts on
  the live project directly — running it as a "drill" against a project
  with a real signed-up user, with no staging copy to test on first,
  is exactly the kind of destructive action needing the account owner's
  explicit in-the-moment authorization, not something to try while
  writing documentation. What *was* verified for free: schema
  reproducibility (`list_migrations` against the live project continues
  to match the local migration files exactly, as it has every stage).
  The genuinely open, unresolved risk — whether this project's Supabase
  plan has automatic backups at all — is named explicitly in
  `docs/disaster-recovery.md` rather than assumed away.
- **A real Content-Security-Policy.** Needs nonce wiring verified
  page-by-page in a real browser; the baseline headers that don't carry
  that risk were added instead.
- **Full accessibility verification of authenticated pages.** No way to
  mint a real authenticated browser session in this environment without
  a service-role key or a real inbox; covered by manual code review
  instead, with the live-scannable pages actually live-scanned.
- **App-store launch assets, a real error-monitoring integration, actual
  environment secrets (`CRON_SECRET`, VAPID keys).** All need either a
  native app that doesn't exist yet, a chosen third-party provider, or
  deployment-environment access this session doesn't have — named as
  open items in `docs/production-readiness.md`/`docs/launch-plan.md`
  rather than guessed at.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean (one pre-existing-pattern warning, 0 errors).
- `pnpm -r test` — 192/192 passing (138 in `@noyala/domain`, unchanged;
  54 in `@noyala/web`, up from 36: +18 across `i18n/format`,
  `cron/require-cron-secret`, `logger`, `outbox/purge-old-records`, and
  one new AI-prompt-escaping test).
- `pnpm --filter @noyala/web build` — succeeds.

## What's next

Stage 9's exit gate ("high-severity security and privacy findings are
resolved; recovery objectives are measured rather than assumed; critical
user journeys meet agreed performance and accessibility budgets;
production deployment, monitoring, rollback and support ownership are
documented") is met on the security-findings and documentation halves,
not yet on "recovery objectives measured" (genuinely unmeasured, per
above) or a full accessibility pass (authenticated pages reviewed
manually, not live-scanned). See `docs/production-readiness.md`'s
prioritized blocker list for what's next, topped by confirming this
project's actual backup/PITR status.
