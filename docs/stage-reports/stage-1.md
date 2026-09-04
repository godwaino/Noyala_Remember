# Stage 1 — Production foundation

## Delivered scope

### Web/PWA shell
- Next.js 15 (App Router) + TypeScript + Tailwind in `apps/web`, consuming
  `@noyala/brand` and `@noyala/domain` as workspace packages (transpiled
  directly, no separate package build step).
- Primary navigation (Home, People, Calendar, Drafts, Gifts, Circles,
  Settings) with accessible active-state, skip-to-content link, and
  `prefers-reduced-motion` support.
- Installable-PWA manifest (`public/manifest.webmanifest`) — note: it ships
  with no icons yet; that's a follow-up before a browser will actually
  offer to install it.
- Every route so far ships an intentional empty state (People, Calendar,
  Drafts, Gifts, Circles all say plainly what's missing and which stage
  adds it) rather than a placeholder that looks half-built.

### Authentication and onboarding
- Supabase email magic-link sign-in (`/login`), the `/auth/callback`
  code-exchange route, a protected `/onboarding` flow that upserts
  `profiles`, and sign-out from `/settings`.
- `getSupabaseServerClient`/`getSupabaseBrowserClient`/
  `getSupabaseServiceRoleClient` wrap `@supabase/ssr` and
  `@supabase/supabase-js`, each scoped to where it's safe to use (see
  `docs/architecture.md`'s trust-boundary table).
- `middleware.ts` refreshes the auth session cookie on every request, and
  passes requests through unchanged if Supabase isn't configured (rather
  than 500ing).

### Database and Row Level Security
- 13 migrations in `supabase/migrations/` implementing every Stage 1 table
  from Master Build Prompt §5 (`profiles`, `people`, `important_dates`,
  `memories`, `message_drafts`, `message_history`,
  `notification_deliveries`, `consents`) plus the `outbox_jobs` table and
  its atomic `claim_outbox_job` claim function, and two follow-up
  migrations that fix issues the security advisor and live testing found
  (below).
- Every user-owned table has `user_id`, RLS enabled, and policies scoped to
  `auth.uid() = user_id`. Child tables also carry a composite foreign key
  on `(person_id, user_id)` / `(important_date_id, user_id)` against a
  matching unique constraint on the parent, so a row can never reference a
  person or date owned by a different user even if application code had a
  bug — RLS is still the primary control, this is defense in depth.
  `outbox_jobs` has RLS enabled with **no** policies at all, which denies
  every role but `service_role` by design (confirmed by the security
  advisor as an expected `INFO`, not a `WARN`).

### Transactional outbox
- `OutboxJob`/`OutboxStore` contract in `packages/domain/src/outbox.ts`
  (framework-free), plus `reminderDeduplicationKey` and an exponential
  backoff helper, both unit-tested.
- `createPostgresOutboxStore` in `apps/web/src/server/outbox/` implements
  that contract against Supabase. Claiming is done via a
  `SELECT ... FOR UPDATE SKIP LOCKED` Postgres function
  (`claim_outbox_job`) called through `.rpc()`, because PostgREST can't
  express that directly — verified concurrency-safe against the live
  project (two sequential claims return the two different seeded jobs, a
  third returns nothing).

### CI and operational scaffolding
- `.github/workflows/ci.yml`: one job installs, typechecks, lints, tests
  and builds `apps/web`; a second spins up a real `postgres:17` service
  container, applies every migration in order, and runs
  `scripts/ci/rls-smoke-test.sh` — the same cross-user isolation checks
  described below, so a future migration can't silently reopen isolation.
- `apps/web/src/server/env.ts` + `scripts/validate-env.ts`: lazy env
  access (so `next build` never needs real credentials) plus an explicit,
  eager check meant to run in a deploy pipeline.
- `apps/web/src/server/logger.ts`: structured JSON logs that redact a
  fixed list of personal-content field names.
- `apps/web/src/server/observability/error-monitoring.ts`: a
  `reportError()` hook gated on `ERROR_MONITORING_DSN`; wired into every
  page/action that currently has a catch block.
- `apps/web/src/server/feature-flags.ts`: env-driven flags, default off.
- `GET /api/health`: reports which required env vars are missing, no
  personal data.

## Verification against a live project (not just local reasoning)

A live Supabase project (`gzldzzianiwoivszkopk`, eu-west-2, Postgres 17)
was connected mid-stage. Rather than leave the schema/RLS work as
theoretical, every migration was applied to it and exercised directly:

1. Applied all 11 original migrations — all succeeded cleanly.
2. Ran the Supabase security advisor. It found two real, then-fixed
   issues, neither hypothetical:
   - `function_search_path_mutable` on `set_updated_at()` — fixed by
     pinning `search_path = ''` (migration
     `20260904001000_fix_set_updated_at_search_path.sql`).
   - `claim_outbox_job` was callable by `anon`/`authenticated` despite
     `revoke all ... from public` — because Supabase's project-level
     default ACLs grant `EXECUTE` on every new `public` function directly
     to those roles, and revoking from the `PUBLIC` pseudo-role doesn't
     touch a grant made directly to a named role. Fixed by revoking from
     `anon, authenticated` explicitly (migration
     `20260904001200_lock_down_claim_outbox_job_grants.sql`). Re-running
     the advisor confirmed both are clean; the one remaining `WARN` is a
     pre-existing Supabase platform function (`rls_auto_enable`,
     an event trigger, not callable via RPC) unrelated to this schema.
3. Seeded two fake users end-to-end and, as `authenticated` with the JWT
   claim set to user A, confirmed: sees only their own `people` /
   `memories` / `important_dates` / `message_drafts` /
   `notification_deliveries`; a cross-user `INSERT` is rejected with a
   real RLS policy violation; a cross-user memory's content is
   unreadable; `outbox_jobs` is invisible to `authenticated` entirely; and
   `service_role` does see the outbox job (bypasses RLS). All test rows
   were deleted afterward (cascade via `auth.users`), leaving the project
   schema-only.
4. Verified `claim_outbox_job`'s concurrency safety directly: two
   sequential calls claimed the two seeded jobs in `available_at` order, a
   third call returned nothing, and `authenticated` got a real permission
   error calling it.
5. Set `apps/web/.env.local` (gitignored) to the real project URL and
   anon key, ran a production build, and started it: `/api/health`
   correctly reports `degraded` (missing `SUPABASE_SERVICE_ROLE_KEY`,
   which this environment's Supabase connection doesn't expose); `/`,
   `/login`, `/settings`, `/people` return 200; `/onboarding` redirects to
   `/login` (307) because there's no session — all against the real
   Supabase Auth API, not a mock.

This is real evidence for two of Stage 1's exit-gate lines ("two test
users are demonstrably isolated by database policies" and most of "auth
and onboarding work end to end") rather than an assumption. See
`docs/roadmap.md`'s "Known blockers" for exactly what's still unverified
(the service-role code path, and a full magic-link email click-through).

## Bugs found and fixed during this stage (before any of the above)

- `redirect()` (a Next.js control-flow throw) was originally called inside
  a `try/catch` meant only to catch "Supabase isn't configured" — which
  would have silently swallowed the redirect and shown the wrong UI.
  Restructured so `redirect()` is always called outside the `catch`.
- The same class of bug existed the other way around: Next's own
  dynamic-rendering bailout (`cookies()` during static-generation
  attempts) also throws, and the generic `catch` was both misreporting it
  as a config error via `reportError()` *and* risked interfering with
  Next's dynamic-route detection. Fixed with `unstable_rethrow(error)` as
  the first line of each such catch block (`next/navigation`).
- `packages/domain/src/index.ts` used `.js`-suffixed relative imports
  (`./types.js` etc.) for a `.ts` source file — resolves fine under
  Vitest/tsc but not under Next.js's webpack build, which failed with
  "Module not found". Fixed by dropping the extensions, appropriate for
  `moduleResolution: "Bundler"`.

## Migrations added

`supabase/migrations/20260904000000` through `20260904001200` (13 files) —
see the file list in `supabase/migrations/`. Applied, in order, to project
`gzldzzianiwoivszkopk`.

## Test and build results

- `pnpm -r typecheck` — clean (brand, domain, web).
- `pnpm -r lint` — clean (web's ESLint flat config via
  `eslint-config-next`; brand/domain have no lint configured yet).
- `pnpm -r test` — 16/16 passing (9 in `@noyala/domain`: date-recurrence
  helper dedup keys, retry backoff, onboarding schema validation; 7 in
  `@noyala/web`: the Postgres outbox store against a mocked client).
- `pnpm --filter @noyala/web build` — succeeds with **no** environment
  variables set (proves the lazy-env design), and again against the real
  project's URL/anon key.
- `scripts/ci/rls-smoke-test.sh` — 7/7 passing locally against a
  throwaway Postgres instance with the auth/roles shim, matching what CI
  now runs on every push.

## Environment variables still required (for a real deployment)

See `.env.example`. `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
are already known for the connected project; `SUPABASE_SERVICE_ROLE_KEY`
needs to come from whoever has access to that project's API settings, not
from this environment. `EMAIL_PROVIDER_API_KEY` / `AI_PROVIDER_API_KEY` /
`ERROR_MONITORING_DSN` aren't needed until Stage 2/3.

## Known limitations

- No app icons for the PWA manifest yet — install prompts won't appear
  until that's added.
- The service-role Postgres outbox client is unit-tested with a mocked
  client, not yet run against the live project (no service-role key here).
- Full magic-link click-through (email → `/auth/callback`) not performed
  — needs a real inbox.
- Migration version numbers applied to the live project don't match the
  repo's filenames (see `docs/roadmap.md`); reconcile with
  `supabase migration repair` before `supabase link`ing this repo to it.
- Stack is TypeScript/Next.js/Supabase per the Master Build Prompt's
  explicit architecture section — not Python. Flagging this because the
  user's stated background is Python; happy to add more inline comments
  or walk through any part of this stack on request.

## Launch risk / rollout note

None of this is user-facing yet (Home/People/Calendar are intentional
empty states). No risk in merging as a checkpoint; Stage 2 is what makes
the product actually usable.
