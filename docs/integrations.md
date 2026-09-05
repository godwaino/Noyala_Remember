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
| **Supabase Auth** | Email magic-link sign-in, session refresh, sign-out, admin user deletion | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (sign-in); `SUPABASE_SERVICE_ROLE_KEY` (admin deletion) | Sign-in/session: **verified against the provider** — a real user (not a test fixture) has signed up and requested magic links against the live project. A real click-through failure surfaced a bug: `/auth/callback` swallowed the actual reason and `/login` never displayed it, so an expired/already-used link (the auth logs show `"One-time token not found"` — consistent with an email client pre-visiting the link) looked identical to "sign-in is broken." Fixed to surface the real reason — `docs/decisions/0007-magic-link-error-surfacing.md`. Admin user deletion remains **implemented**, not yet verified — no service-role key in this environment. |
| **Supabase Postgres + RLS** | Schema, RLS policies, the `claim_outbox_job` RPC | `SUPABASE_SERVICE_ROLE_KEY` for the outbox client; anon key + RLS for everything else | **Verified against the provider** — every migration applied and exercised live: cross-user RLS isolation, cascade deletes, the outbox crash-recovery reclaim (`docs/stage-reports/stage-1.md`, `stage-2.md`). Not production-enabled — no deployed environment exists yet. |
| **Postgres-backed outbox client** (`apps/web/src/server/outbox/postgres-outbox.ts`) | enqueue (idempotent), claim, mark succeeded/failed | `SUPABASE_SERVICE_ROLE_KEY` | **Tested locally** (7 unit tests against a mocked Supabase client). The underlying SQL it calls is verified against the provider (see row above); the JS wrapper itself is not, since this environment's Supabase connection doesn't expose the service-role key. |
| **Email (reminders)** | Send a reminder email | `EMAIL_PROVIDER_API_KEY` + `EMAIL_FROM_ADDRESS` (Resend); unset falls back to a console/log adapter | **Implemented, tested locally** (unit tests mock `fetch`; the discovery→outbox→processor pipeline verified end-to-end against the live Supabase project using the console adapter). **Not verified against the provider** — no Resend account/key in this environment. |
| **Web push (reminders)** | Subscribe (browser), send a push notification | Self-generated VAPID key pair (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, plus `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for the browser); unset falls back to console/log | **Implemented, tested locally** (unit tests mock the `web-push` package; `push_subscriptions` RLS verified live). **Not verified against the provider** — no real browser subscription was exercised in this environment (no headless-browser + user-gesture flow available here). Native push is still Stage 7. |
| **Reminder discovery + outbox processing** (`/api/cron/discover-reminders`, `/api/cron/process-outbox`) | Find due reminder windows, create/upsert `notification_deliveries` + outbox jobs, process up to 20 jobs/run | `CRON_SECRET` (required — routes 401 without it); scheduled via `apps/web/vercel.json` (daily on the Hobby plan's cron granularity; a Pro plan allows more frequent runs) | **Verified against the provider** — exercised end-to-end against the live Supabase project: idempotent double-discovery (still one row), atomic claim, mark-sent, and the cancel-on-edit path (editing a date cancels its `scheduled` rows without touching `sent` ones) all confirmed live. The HTTP route handlers themselves are **tested locally** only (this environment's Supabase connection has no service-role key, so the actual Next.js routes couldn't be invoked here — the SQL/data operations they perform were verified directly instead). |
| **AI message generation** (`apps/web/src/server/ai`) | Generate exactly three message options for a person/occasion/tone/channel | `AI_PROVIDER_API_KEY` (OpenAI); unset falls back to a deterministic demo generator | Demo generator: **verified against the provider** — its output was exercised through the real `message_drafts` insert/RLS path on the live Supabase project (see below), not just mocked. OpenAI adapter: **implemented, tested locally** (unit tests mock `fetch`; Structured Outputs response parsing, timeout, and error-classification all covered). **Not verified against the provider** — no OpenAI key in this environment. Master Build Prompt §8's requirement — a clearly labelled deterministic demo generator whenever no AI key is configured — is met by construction: `getMessageProvider()` only ever returns the OpenAI adapter when `AI_PROVIDER_API_KEY` is set. |
| **message_drafts / message_history** (`apps/web/src/server/messages`) | Generate, edit, and record the user's actual handoff action (copied/opened-in-app/marked-sent) | RLS-scoped anon key only — no service role needed | **Verified against the provider** — seeded a real batch of 3 drafts, confirmed the `model_metadata->>batchId` grouping query, an authenticated edit, a `message_history` insert, that `message_history` correctly rejects update/delete (no policy exists for either), and that a second user sees none of the first's rows. All seeded rows removed afterward. |
| **WhatsApp/SMS/email handoff** (copy/open-app) | `wa.me`, `sms:`, `mailto:` links prefilled with the approved text | none | **Implemented, tested locally is not applicable** (pure URL-building functions, no external call to test) — not exercised against real mobile OS share targets in this environment (no device/browser combination available here to confirm each platform actually opens with the text prefilled). |
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
exist. Stage 3's message generation has the same kind of technical safety
cap rather than a validated number: `AI_GENERATION_MAX_PER_HOUR` (default
20) limits generations per user per hour so a runaway client can't rack up
unbounded provider spend — not a number anyone has confirmed against a
real cost ceiling.
