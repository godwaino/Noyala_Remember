# Production readiness review

Master Build Prompt Stage 9 asks for a "production readiness review with
rollback criteria" and for "production deployment, monitoring, rollback
and support ownership" to be documented. This is that review, against the
product as it actually stands after Stage 9 (0–7 built with the
documented partial/blocked exceptions; Stage 8 not started).

## Current deployment shape

- **App**: Next.js 15 on Vercel (`apps/web`), auto-deployed from this
  repo's default branch, PR previews on every branch (see the Vercel
  check runs on this stage's own PR for a live example).
- **Database**: Supabase Postgres, project `gzldzzianiwoivszkopk`
  (`eu-west-2`). Migrations in `supabase/migrations/` are the source of
  truth; `docs/disaster-recovery.md` covers backup/restore status.
- **Background work**: two Vercel Cron routes
  (`/api/cron/discover-reminders`, `/api/cron/process-outbox`), gated by
  `CRON_SECRET`, scheduled in `apps/web/vercel.json`.
- **No staging environment exists** — every PR gets a Vercel preview
  deployment (a real, isolated *app* deployment), but all of them point at
  the same single Supabase project as production, since only one project
  exists. A schema migration therefore has no lower-risk environment to
  land in first; it hits the same database real users are on. Provisioning
  a genuinely separate staging Supabase project is a real option, at real
  additional cost, and is a decision for the account owner, not assumed
  here.

## Rollback criteria

Rollback is warranted when, after a deploy:

- A previously-working authenticated route 5xxs or hangs for a
  meaningful fraction of requests (check Vercel's function logs/error
  rate for the deployment).
- `/api/health` starts returning `degraded` (503) for a *new* reason —
  it's already expected to report `degraded` today because
  `SUPABASE_SERVICE_ROLE_KEY` is one of its checked-required vars and
  isn't set in this environment (see `docs/roadmap.md`'s "Known
  blockers"), so that specific cause is not itself a regression signal.
  A newly-missing *different* required var, surfaced in the response's
  `missingRequiredEnv` array, is.
- A migration fails partway (check `get_advisors` and `list_migrations`
  against the live project immediately after any migration-carrying
  deploy) — Postgres migrations in this repo are written to be safe to
  re-run (`if exists`/`if not exists` guards throughout), but a partial
  failure still needs immediate attention, not a wait-and-see.
- Cross-user data leakage of any kind is reported or discovered — this is
  an immediate rollback-and-hotfix situation, not a "next deploy" fix,
  given this codebase's whole security model rests on RLS being correct.

**How to roll back**: revert the app deployment via Vercel's dashboard
(redeploy the previous successful deployment) — this is fast and safe
since Vercel deployments are immutable and instantly swappable. A
**schema** rollback is not a symmetric operation — Postgres migrations in
this repo are additive/forward-only (no corresponding `down` migrations
exist, matching the Supabase-managed-migrations convention already noted
in `docs/roadmap.md`'s "Known blockers"). If a migration itself is the
problem, the fix is a new forward migration that corrects it, not an
attempted schema rollback — write and apply the fix, then redeploy the
app if the app code assumed the broken schema.

## Monitoring

- **Error monitoring**: `apps/web/src/server/observability/error-monitoring.ts`
  is a real hook, currently logging to console/structured logs rather than
  a configured provider — `ERROR_MONITORING_DSN` is unset everywhere (see
  `docs/roadmap.md`'s "Known blockers"). Until a provider (e.g. Sentry) is
  wired in, the only way to see production errors is Vercel's function
  logs. **This is a real gap for a launched product** — nothing pages
  anyone when something breaks; someone has to go looking.
- **Database**: Supabase's own dashboard exposes query performance,
  connection counts, and the security/performance advisors this stage
  used repeatedly (`get_advisors`) — these should be checked periodically
  even without an alerting integration, since nothing pushes their
  findings anywhere on its own.
- **Health endpoint**: `/api/health` exists (Stage 1) and reports
  `ok`/`degraded` based on which required env vars are actually set —
  nothing currently polls it on a schedule or alerts on its result; wiring
  it into an uptime-check service (even a free one) would close a real
  gap cheaply.

## Support ownership

There is no support console (Stage 8) and no support team — the account
owner is the only person who can act on a user-reported issue today, and
does so directly against the Supabase project (see
`docs/data-protection.md`'s "Operational requests" section for exactly
what that looks like for a privacy request specifically). This is fine at
current scale and is not something to build ahead of actual need, but it
means:

- There is no on-call rotation, no escalation path, and no SLA — any
  incident response depends entirely on the account owner's availability.
- The reporting user's magic-link/OTP sign-in issue (`docs/roadmap.md`'s
  "Known blockers") is the concrete example already on record of exactly
  this: a real user hit a real bug, and resolving it needed direct manual
  investigation against the live project, not a support workflow.

## What's blocking a confident production launch today

In priority order:

1. **Backup/PITR status unconfirmed** (`docs/disaster-recovery.md`) — the
   single highest-severity open item. Resolve by checking the Supabase
   plan and, if on Free, deciding whether to upgrade or build a manual
   export process before real user data accumulates further.
2. **No error monitoring provider configured** — production errors are
   only visible by manually checking logs. Cheap to fix (set
   `ERROR_MONITORING_DSN`, pick a provider) whenever prioritized.
3. **`CRON_SECRET`/VAPID keys/AI provider key** — per `docs/roadmap.md`'s
   "Known blockers," reminders and push don't actually fire and AI
   generation stays on the demo generator until these are set in the
   deployment environment. Not a code gap — an environment-configuration
   task for whoever deploys next.
4. **Stage 4's cloud contact sync and direct/scheduled send, Stage 7's
   native app, Stage 8 entirely** — real, scoped, already-documented
   future work, not launch blockers for the web app as it stands today.
