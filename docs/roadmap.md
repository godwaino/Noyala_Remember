# Noyala — Roadmap

Stages mirror the Master Build Prompt §21 exactly. Status is evidence-based:
a stage is only "Done" when its exit gate is demonstrated (tests, build
output, or an explicit documented blocker), not when code merely exists.

| Stage | Name | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Discovery, brand foundation, implementation baseline | Done | `docs/stage-reports/stage-0.md` |
| 1 | Production foundation | Done (with documented blockers) | `docs/stage-reports/stage-1.md` |
| 2 | Relationship core | In progress | `docs/stage-reports/stage-2.md` |
| 3 | Communication intelligence | Not started | — |
| 4 | Connected contacts and communication | Not started | — |
| 5 | Relationship care | Not started | — |
| 6 | Shared circles and gifting | Not started | — |
| 7 | Native mobile and voice capture | Not started | — |
| 8 | Commercial platform and administration | Not started | — |
| 9 | Scale, localisation and launch readiness | Not started | — |

## Dependency map

- Stage 2 (people/dates/memories/reminders) depends only on Stage 1's auth,
  schema/RLS conventions and outbox.
- Stage 3 (AI drafts) depends on Stage 2's memories existing to select as
  context.
- Stage 4 (contact sync, push, direct send) depends on Stage 1's provider
  adapter pattern and Stage 3's approval-policy shape for scheduled sends.
- Stage 5 (relationship care) depends on Stage 2 (people) and reuses
  Stage 3's context-selection pattern for conversation-prep cards.
- Stage 6 (circles/gifting) depends on Stage 2 (people/dates) and adds new
  authorization rules on top of Stage 1's RLS conventions.
- Stage 7 (mobile/voice) depends on `packages/domain` staying framework-free
  so `apps/mobile` can reuse it, and on Stage 3's memory-extraction review
  pattern for transcripts.
- Stage 8 (billing/admin) can start once Stage 1's provider-adapter pattern
  and Stage 2's entitlement-relevant data exist; it does not block 2–7.
- Stage 9 (scale/launch) is a hardening pass over everything built in 0–8.

## Response to review.md (2026-09-05)

The repo owner added `review.md` at the repository root with an
architecture review of the Master Build Prompt. It raises real gaps and
process suggestions. Rather than let a loose root file be the only record
of it, here's where each point lands:

**Already resolved, with evidence:**
- "A child record could carry the current user's `user_id` while
  referencing another user's `person_id` unless explicitly prevented" —
  this is exactly why `important_dates`/`memories`/`message_drafts`/
  `message_history` carry a composite foreign key on
  `(person_id, user_id)` against a matching unique constraint on `people`
  (see `docs/architecture.md` and the Stage 1/2 migrations). Verified live
  by seeding two users and confirming a cross-user insert is rejected —
  `docs/stage-reports/stage-1.md` and `stage-2.md`.

**Tracked against the stage that owns them (not yet built, so not yet a
regression):**
- Ownership vs. shared-circle access, field-level sharing, surprise-gift
  recipient mapping → Stage 6. RLS alone won't implement field-level
  sharing; needs an explicit design before that stage's migrations.
- Provider delivery idempotency / uncertain-delivery reconciliation after
  a worker crash → applies once a real send/notification provider exists
  (Stage 2's reminder adapters, Stage 4's direct-send). The Stage 1 outbox
  (attempt counts, dead-letter, deterministic dedup keys) is the
  foundation; the provider-specific reconciliation policy still needs
  writing when that adapter is built.
- Message approval binding to exact content + destination → Stage 3
  design decision before drafts/approval exist. Recommend adopting the
  reviewer's proposal (approve the final message once; require fresh
  approval if content or destination changes) rather than leaving it
  ambiguous.
- Immutable draft context outliving a deleted memory → Stage 3, once
  `message_drafts.context_snapshot` holds real content. Needs an explicit
  deletion-cascade decision (e.g. redact snapshot content when the source
  memory is deleted, keep only non-content metadata) before that table is
  used for anything real.
- Occasions beyond fixed month/day (lunar/calendar-dependent religious or
  cultural dates) → the current `important_dates` schema only supports
  Gregorian month/day/optional-year recurrence. Genuine gap against the
  product's "religious/cultural occasions" capability; needs its own
  design pass, likely alongside Stage 2's remaining reminder-adapter work
  or as a dedicated follow-up.
- Offline cache revocation / immediate-revocation vs. already-downloaded
  data → Stage 7 (native/offline).

**Adopted now:** stage reports should distinguish *implemented*, *tested
locally*, *verified against the provider*, and *production-enabled*
rather than a flat "done" — already the de facto pattern in
`docs/stage-reports/stage-1.md` and `stage-2.md`, now made explicit here
as the convention going forward.

**Product/UX proposals needing a decision, not unilaterally adopted:** the
review also proposes several changes beyond the Master Build Prompt's
literal scope — a redesigned Home (Today/Prepare/Reconnect), memory
trust/versioning (source, last-confirmed, supersession), an explicit
"sounds like me" voice-profile setup, per-person/occasion pause controls,
and collapsing primary nav to Home/People/Calendar/More. These would
change already-shipped IA (nav, Home) or add scope the original spec
doesn't mention (pause controls, memory versioning). Flagged for the
repo owner to decide, not implemented here.

## Stage 2 remaining work

People/dates/memories CRUD, Home/Calendar, CSV/vCard export and
delete-person/account are done and verified (see stage report). Still
open before Stage 2's exit gate is fully met:

- Email and web-push reminder adapters, the reminder-discovery scheduled
  job, and delivery-history UI. The domain logic they need
  (`isInReminderWindow`, the Stage 1 outbox) already exists.
- Offline-tolerant PWA behaviour for read/capture paths (no service worker
  yet).
- A real keyboard-navigation/screen-reader pass — today's forms have
  labels and focus-visible styling, but nothing formal has verified it.

## Known blockers (do not silently skip; re-check each stage)

- **Live Supabase project connected, but without its service-role key in
  this environment.** Project `gzldzzianiwoivszkopk` (eu-west-2) has all
  Stage 1 migrations applied and was used to verify RLS cross-user
  isolation and the `claim_outbox_job` grants for real — see
  `docs/stage-reports/stage-1.md`. `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are in `apps/web/.env.local` (gitignored)
  and the production build/auth pages were smoke-tested against it.
  `SUPABASE_SERVICE_ROLE_KEY` isn't exposed by the Supabase connection tool
  used to provision it, so the service-role-only code paths — the
  Postgres-backed outbox client and any future background worker — are
  unit-tested with a mocked client but not yet run against the live
  project. Whoever has that key next should add it to `.env.local` and
  exercise `createPostgresOutboxStore` for real. A full magic-link
  click-through (receiving the email, following the link to
  `/auth/callback`) also hasn't been done — it needs a real inbox.
- **Migration version numbers won't match if this repo is later `supabase
  link`ed to project `gzldzzianiwoivszkopk`.** Migrations were applied via
  the Supabase management API, which timestamps them at apply time, not
  with the filenames' embedded timestamps. Reconcile with
  `supabase migration repair` rather than re-running `supabase db push`
  blind.
- **No AI provider key.** Stage 3 is not started; when it begins, the
  deterministic demo generator (Master Build Prompt §8) must exist even
  without a key.
- **No mobile app yet.** `apps/mobile` is not created until Stage 7;
  `packages/domain` is kept framework-free specifically so that stage
  doesn't require reworking shared logic.
