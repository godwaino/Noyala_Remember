# Noyala

> Remember the person, not just the date.

Noyala is a mobile-first personal relationship assistant: it helps people
remember birthdays and important personal details, prepares thoughtful
message drafts for explicit review and approval, and never sends anything
on its own. See
[`Noyala-Full-Product-Architecture-and-Master-Build-Prompt.md`](./Noyala-Full-Product-Architecture-and-Master-Build-Prompt.md)
for the full product/architecture spec this repository implements, and
`docs/roadmap.md` for what's built so far versus what's next.

This is being built in stages on one production architecture, not as a
disposable prototype — see `docs/roadmap.md` for the stage list and
`docs/stage-reports/` for what was actually verified at each one.

## Repository layout

```
apps/web/            Next.js App Router web app (the PWA)
apps/mobile/          Expo/React Native app (iOS/Android) — see apps/mobile/.env.example
packages/brand/       Product name, tagline, metadata, design tokens
packages/domain/       Framework-free shared types, validation, pure logic
supabase/migrations/  SQL migrations (schema + Row Level Security)
docs/                 Living documents — read docs/architecture.md first
```

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (`corepack enable` will pick up the version
  pinned in `package.json`)
- A Supabase project (hosted, or run locally with the
  [Supabase CLI](https://supabase.com/docs/guides/cli) + Docker) for
  anything beyond the static shell pages

## Setup

```bash
pnpm install
cp .env.example apps/web/.env.local   # then fill in real values
```

At minimum, for auth/onboarding to work, `apps/web/.env.local` needs:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from your
  Supabase project's API settings (safe for the browser).
- `SUPABASE_SERVICE_ROLE_KEY` — same page, **server-only, never commit
  it**. Needed for the transactional outbox / background-worker code path.
- `NEXT_PUBLIC_APP_URL` — used to build the magic-link redirect URL.

See `.env.example` for the full list, including what's optional until
later build stages (email/AI providers, error monitoring).

Without any Supabase config at all, `pnpm --filter @noyala/web build` and
the static routes still work — the app degrades to an honest "sign-in
isn't configured yet" state rather than crashing. `GET /api/health`
reports exactly which required variables are missing (never their
values).

## Database migrations

Migrations live in `supabase/migrations/`, applied in filename order. With
the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your
project:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

For local development with Docker: `supabase start` runs a full local
stack and automatically applies `supabase/migrations/` and then
`supabase/seed.sql` (fictional dev-only data — see Master Build Prompt
§17 — never real personal information).

Every user-owned table has Row Level Security enabled with policies scoped
to `auth.uid() = user_id`; `outbox_jobs` intentionally has RLS enabled
with **no** policies, so only the service-role key can touch it. See
`docs/architecture.md` for the full trust-boundary rationale, and
`docs/stage-reports/stage-1.md` for how this was verified against a real
project (not just read from the SQL).

## Development

```bash
pnpm dev            # apps/web on http://localhost:3000
pnpm -r typecheck
pnpm -r lint
pnpm -r test
pnpm --filter @noyala/web build   # production build
```

Before promoting a build to a real environment, also run:

```bash
pnpm --filter @noyala/web validate-env
```

which fails loudly if a required variable is missing — unlike the app
itself, which is deliberately lenient at build time (see above) so CI
doesn't need real secrets.

## Mobile app (`apps/mobile`)

```bash
cp apps/mobile/.env.example apps/mobile/.env.local   # same Supabase project as apps/web
pnpm --filter @noyala/mobile web       # runs in a browser via react-native-web
pnpm --filter @noyala/mobile ios       # needs Xcode/a simulator
pnpm --filter @noyala/mobile android   # needs Android Studio/a simulator or device
pnpm --filter @noyala/mobile typecheck
```

AI message generation and voice transcription go through two
bearer-token-authenticated routes in `apps/web`
(`/api/mobile/message-drafts`, `/api/mobile/voice-captures/[id]/transcribe`)
rather than a direct Supabase call, since both need a server-side secret —
set `EXPO_PUBLIC_API_BASE_URL` in `apps/mobile/.env.local` to wherever
`apps/web` is running. See `docs/stage-reports/stage-7-mobile.md` for what's
built and what's verified vs. native-only/unverified without a real device.

## CI

`.github/workflows/ci.yml` runs on every push/PR: install, typecheck,
lint, test and build `apps/web` in one job; in a second job, it spins up a
real Postgres container, applies every migration, and re-runs the
cross-user Row Level Security isolation checks (`scripts/ci/`) so a future
migration can't silently reopen tenant isolation.

## Scheduled jobs

Stage 1 ships the transactional outbox (`outbox_jobs` table,
`claim_outbox_job` for concurrency-safe claiming, and
`packages/domain`'s `OutboxStore` contract with a Postgres-backed
implementation in `apps/web/src/server/outbox/`) but no scheduler wiring
yet — the reminder-discovery job itself is Stage 2 scope. See
`docs/roadmap.md`.

## Deployment

Not yet documented — no environment has been deployed to. This section
will cover the hosting target, environment variables, migration order and
rollback steps once Stage 2 makes the product user-facing.

## Testing

- Unit tests: `packages/domain` (date/dedup/backoff logic, onboarding
  schema validation) and `apps/web` (the Postgres outbox store against a
  mocked Supabase client) via Vitest.
- Database/RLS tests: `scripts/ci/rls-smoke-test.sh`, run in CI against a
  real Postgres container.
- Integration/E2E tests beyond the above are Stage 2+ scope, once there's
  real user-facing functionality to exercise.
