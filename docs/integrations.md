# Noyala — Integration capability matrix

Requested by `review.md`: "each provider's supported operations, setup
dependencies and verification status," using four distinct statuses so
"the prompt already prohibits fake success" is actually enforceable:

- **Implemented** — the adapter/interface exists in code.
- **Tested locally** — exercised against a mock/fake, or a local
  throwaway instance (e.g. the CI Postgres shim).
- **Verified against the provider** — exercised against the real, live
  service (not a mock), even if only manually and even without
  production credentials.
- **Production-enabled** — actually configured with production
  credentials in a deployed environment.

A row can skip a status (e.g. go straight from "implemented" to
"production-enabled") but never claim a later status without the earlier
ones being true first.

| Provider | Operations supported | Setup dependency | Status |
| --- | --- | --- | --- |
| **Supabase Auth** | Email magic-link sign-in, session refresh, sign-out, admin user deletion | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sign-in); `SUPABASE_SERVICE_ROLE_KEY` (admin deletion) | Sign-in/session: **verified against the provider** (live project, real `auth.getUser()` calls — `docs/stage-reports/stage-1.md`). Full magic-link click-through (receiving the email) and admin user deletion: **implemented**, not yet verified — no email inbox or service-role key in this environment. |
| **Supabase Postgres + RLS** | Schema, RLS policies, the `claim_outbox_job` RPC | `SUPABASE_SERVICE_ROLE_KEY` for the outbox client; anon key + RLS for everything else | **Verified against the provider** — every migration applied and exercised live: cross-user RLS isolation, cascade deletes, the outbox crash-recovery reclaim (`docs/stage-reports/stage-1.md`, `stage-2.md`). Not production-enabled — no deployed environment exists yet. |
| **Postgres-backed outbox client** (`apps/web/src/server/outbox/postgres-outbox.ts`) | enqueue (idempotent), claim, mark succeeded/failed | `SUPABASE_SERVICE_ROLE_KEY` | **Tested locally** (7 unit tests against a mocked Supabase client). The underlying SQL it calls is verified against the provider (see row above); the JS wrapper itself is not, since this environment's Supabase connection doesn't expose the service-role key. |
| **Email (reminders)** | none yet | — | **Not started.** Stage 2's remaining work. |
| **Web/native push (reminders)** | none yet | — | **Not started.** Stage 2's remaining work (web), Stage 7 (native). |
| **AI message generation** | none yet | — | **Not started.** Stage 3. Master Build Prompt §8 requires a deterministic demo generator when no key is configured — that requirement applies from the first line of code in that stage, not as an afterthought. |
| **WhatsApp/SMS/email handoff** (copy/open-app) | none yet | — | **Not started.** Stage 3. |
| **Direct/scheduled send providers** | none yet | — | **Not started.** Stage 4, gated on Stage 3's approval-binding decision (`docs/state-transitions.md`). |
| **Cloud contact providers** (Google/Apple/Microsoft) | none yet | — | **Not started.** Stage 4. |
| **Transcription** | none yet | — | **Not started.** Stage 7. |
| **Billing** | none yet | — | **Not started.** Stage 8. |
| **Error monitoring** | `reportError()` hook exists, gated on `ERROR_MONITORING_DSN` | `ERROR_MONITORING_DSN` | **Implemented** (falls back to structured console logging when unset). No real provider (Sentry or similar) wired in yet — **not tested against a provider**. |

## Acceptance budgets

`review.md` also asks for "measurable acceptance budgets: expected load,
reminder lateness, response times, recovery objectives and AI spend
limits." These need real numbers from the product owner (expected user
count, acceptable reminder lateness, AI cost ceiling) — inventing them
here would just be a different flavor of the "fake success" problem this
document exists to prevent. Tracked as an open input needed before Stage
9 (launch readiness) can define pass/fail budgets; Stage 2's own reminder
work should still avoid obviously unbounded behavior (e.g. the outbox's
exponential backoff cap, already implemented) even before firm numbers
exist.
