# Noyala — Roadmap

Stages mirror the Master Build Prompt §21 exactly. Status is evidence-based:
a stage is only "Done" when its exit gate is demonstrated (tests, build
output, or an explicit documented blocker), not when code merely exists.

| Stage | Name | Status | Evidence |
| --- | --- | --- | --- |
| 0 | Discovery, brand foundation, implementation baseline | Done | `docs/stage-reports/stage-0.md` |
| 1 | Production foundation | Done (with documented blockers) | `docs/stage-reports/stage-1.md` |
| 2 | Relationship core | Done (informal accessibility pass only) | `docs/stage-reports/stage-2.md` |
| 3 | Communication intelligence | Done (OpenAI adapter unverified — no key) | `docs/stage-reports/stage-3.md` |
| 4 | Connected contacts and communication | Partial — CSV/vCard import + device picker done, cloud OAuth and direct/scheduled send blocked on credentials | `docs/stage-reports/stage-4.md` |
| 5 | Relationship care | Done | `docs/stage-reports/stage-5.md` |
| 6 | Shared circles and gifting | Done | `docs/stage-reports/stage-6.md` |
| 7 | Native mobile and voice capture | Partial — schema/RLS and domain logic done and verified; native client not started | `docs/stage-reports/stage-7.md` |
| 8 | Commercial platform and administration | Not started (deliberately skipped this round — see below) | — |
| 9 | Scale, localisation and launch readiness | Partial — security/RLS-performance hardening, accessibility, i18n foundation, retention and docs done; backup/restore drill, real CSP, and app-store assets blocked or deferred | `docs/stage-reports/stage-9.md` |

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
architecture review of the Master Build Prompt. It raised real gaps and
process suggestions, acted on as follows rather than left as a loose root
file.

**Resolved outright, with evidence:**
- *Cross-record isolation* ("a child record could carry the current
  user's `user_id` while referencing another user's `person_id`") — this
  is exactly why `important_dates`/`memories`/`message_drafts`/
  `message_history` carry a composite foreign key on `(person_id,
  user_id)` against a matching unique constraint on `people`. Verified
  live by attempting exactly that cross-reference — `docs/stage-reports/stage-1.md`.
- *Reminder crash recovery* ("what happens when a worker crashes before
  recording success") — `claim_outbox_job` now reclaims jobs stuck in
  `processing` past a staleness threshold, dead-lettering ones that have
  already exhausted their attempts rather than reclaiming forever. New
  migration `20260905000000_reclaim_stale_outbox_jobs.sql`, decision
  recorded in `docs/decisions/0006-outbox-stale-processing-reclaim.md`,
  verified live and covered by `scripts/ci/outbox-smoke-test.sh` on every
  push. This does not solve per-provider delivery idempotency (a provider
  that accepted a send right before the crash) — that still needs a real
  provider to design against (Stage 2/4).
- *Message approval binding* — decided: binds to exact content, channel
  and recipient; any change invalidates it. `docs/decisions/0004-message-approval-binding.md`,
  detailed in `docs/state-transitions.md`.
- *Deletion vs. immutable draft snapshots* — decided: the existing
  cascade (person/account deletion removes `message_drafts` and their
  snapshots) is sufficient; no separate per-memory redaction mechanism.
  `docs/decisions/0005-deletion-cascade-covers-snapshots.md`.
- The four requested process deliverables now exist as living documents:
  `docs/permissions.md` (permission matrix), `docs/state-transitions.md`
  (reminders/approval/deletion/account lifecycles), `docs/integrations.md`
  (provider capability matrix using the *implemented / tested locally /
  verified against the provider / production-enabled* taxonomy the review
  proposed — adopted as the standing convention for every future
  provider integration, not just a one-off label).

**Genuinely open — needs a product decision, not a code fix:**
- *Occasions beyond fixed month/day* (lunar/calendar-dependent religious
  or cultural dates) — the current `important_dates` schema only supports
  Gregorian month/day/optional-year recurrence. This is a real gap against
  the product's "religious/cultural occasions" capability, and resolving
  it means picking which calendar systems to support and where their
  authoritative occurrence dates come from (an external calendar-
  conversion service, most likely) — not something to guess at
  unilaterally. Tracked as an open question for Stage 2's continuation or
  a dedicated follow-up; needs the repo owner's input on scope.
- *Shared-circle permission matrix, field-level sharing, surprise-gift
  recipient mapping* — `docs/permissions.md` has a placeholder section
  listing exactly what Stage 6 needs to settle before its migrations are
  written; not designed yet because circles don't exist yet.
- *Offline cache revocation vs. already-downloaded data* — Stage 7
  (native/offline), same reasoning.

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

People/dates/memories CRUD, Home/Calendar, CSV/vCard export,
delete-person/account, reminder-delivery adapters (email + web push),
the reminder-discovery/outbox-processing scheduled routes, delivery-history
UI, and a basic offline-tolerant service worker are all done and verified
(see stage report and `docs/stage-reports/stage-2.md`). Only one item is
still open before Stage 2's exit gate is fully met:

- A real keyboard-navigation/screen-reader pass — today's forms have
  labels and focus-visible styling, but nothing formal has verified it.
  Master Build Prompt §21 puts the full WCAG audit at Stage 9 explicitly,
  so this is a soft gap rather than a blocker to moving on.

## Stage 3 remaining work

Message Studio, three-option AI generation (OpenAI adapter + deterministic
demo fallback), context selection with sensitive-memory exclusion,
editable drafts with batch-based version history, copy/WhatsApp/SMS/email
handoff, message action history, and rate limiting are all done and
verified (see `docs/stage-reports/stage-3.md`). Nothing is structurally
open; the one real gap is that the OpenAI adapter has never been exercised
against the real API (no key in this environment) — see "Known blockers"
below.

## Stage 4 remaining work

Done and verified: CSV/vCard import with preview, field mapping, duplicate
review and an undo window; a device-contact adapter contract with a real
(if narrowly-supported) browser Contact Picker implementation; an editable
notification preference centre on `/settings`. See `docs/stage-reports/stage-4.md`.

Genuinely blocked, not skipped:

- **Cloud contact providers (Google/Apple/Microsoft)** — need real OAuth
  app registrations (client id/secret, approved redirect URIs) with each
  provider, which this environment cannot create. Only a contract could be
  written here without one line of it ever being exercisable, so nothing
  was written — per the Master Build Prompt's own instruction to "define
  contracts and migrations incrementally rather than creating unused
  speculative tables," a `contact_sources`/`contact_sync_runs` migration
  stays undrafted until a real adapter exists to populate it.
- **Two-way sync** — explicitly gated on the cloud providers above (one-way
  import first, per §10); not applicable yet.
- **Direct/scheduled communication providers** (WhatsApp Business API,
  Twilio, etc.) and the **approval-policy/scheduled-message persistence**
  that would gate them — same reasoning: no real provider account exists
  to build and verify an adapter against, and the approval-binding decision
  (`docs/decisions/0004-message-approval-binding.md`) already says what the
  data model needs to do once one exists. Building the tables now, with
  nothing able to write to them, would be exactly the unused speculative
  schema the master prompt says not to create.
- **Native-push adapter** — needs `apps/mobile` (Stage 7). Web push already
  exists from Stage 2; this is additionally about a native mobile push
  token, not applicable until the mobile app exists.

## Stage 5 remaining work

Interaction logging, follow-up commitments (create/complete/dismiss),
optional per-person reconnect cadence with snooze, a Home-page reconnect
suggestion list, a due-follow-ups list, and a conversation-prep card are
all done and verified (see `docs/stage-reports/stage-5.md`). Every exit
gate item is met by construction: no score/streak/ranking column exists
anywhere in the new schema, every suggestion states its reason inline
("last contact N days ago, cadence M days") and can be snoozed or ignored
per-person, sensitive memories are excluded from the prep card by default
with an explicit reveal, and reconnect/follow-up suggestions are in-app
lists rather than push/email notifications — so there's no notification
volume to exceed in the first place for this feature. Nothing here is
gated on external credentials, so nothing is deferred.

**Known scope decision, not a gap**: follow-up/reconnect reminders don't
go through the Stage 2 email/push pipeline (`notification_deliveries`) —
they're an always-visible in-app list instead. Wiring them into that
pipeline later (so a due follow-up can also arrive as a push notification)
would need `notification_deliveries.important_date_id`'s NOT NULL FK
either relaxed or extended to a polymorphic reference — a real schema
change, deliberately not made speculatively this round. If that's wanted,
it's a small, well-scoped follow-up.

## Stage 6 remaining work

Circles (create/invite/accept/decline/revoke/leave/remove), person sharing
with field-aware flags (`share_memories`, `share_gift_planning`), and
collaborative gift planning with surprise-mode hiding are all done and
verified live against the real Supabase project — see
`docs/stage-reports/stage-6.md` for the full policy-level test log. A real
bug (self-referential RLS recursion on `circle_members`) was found and
fixed during that verification, not just during code review — see
`docs/decisions/0011-circle-membership-rls-recursion.md`.

**Known scope decisions, not gaps:**
- `gift_ideas` is a single table with an inline status lifecycle
  (idea → planned → purchased → given), not the Master Build Prompt's
  three-table `gift_ideas`/`gifts`/`gift_collaborators` split. A `given`
  row doubles as the past-gift history entry the prompt asks for.
  `gift_collaborators` (multi-person cost-splitting on one gift) is a
  well-scoped follow-up if ever wanted — nothing in the current schema
  blocks adding it later.
- No merchant/affiliate adapter exists. The exit gate only requires
  "gifting remains useful without a merchant integration," which it is;
  building an adapter with no real provider to integrate would be
  speculative scope.
- Invitation **expiry** (the Master Build Prompt's exit-gate wording) is
  implemented as explicit owner/organiser **revocation** rather than a
  time-based TTL — there's no `expires_at` column. Revocation is verified
  live (a revoked invitation's token can never be accepted, even mid-flight
  after being fetched). A calendar-time expiry would be a small additive
  migration (one nullable timestamp + one extra `accept_circle_invitation`
  check) if wanted later.
- Role **changes** are revoke-and-reinvite, not in-place editing — verified
  live that a direct `UPDATE circle_members SET role = ...` by anyone,
  including the owner, affects zero rows. `docs/permissions.md` records
  this as a deliberate simplification, not an oversight.

## Stage 7 remaining work

`voice_captures`/`extracted_memory_candidates` schema, RLS, and the
provider-independent domain logic (`TranscriptionProvider` contract +
deterministic mock, `extractFactCandidates`, the offline-capture-queue
state machine) are done and verified — see `docs/stage-reports/stage-7.md`
for the full live-verification log, including a real bug the verification
found and fixed (`storage_path` couldn't be cleared for independent audio
deletion — see `docs/decisions/0012-voice-captures-nullable-storage-path.md`).

**Deliberately not started this round, not silently skipped** — put to the
user directly before any of this was built, who chose to scope the round
this way rather than build an unrunnable client:

- **The Expo/React Native mobile app itself.** This environment has no
  iOS/Android simulator or device — a scaffolded app could be typechecked
  but never actually run, and Stage 7's exit gate explicitly requires
  "essential journeys pass on supported iOS and Android targets." Building
  a client no one can run or test here would be unverified scope, not
  delivered scope, exactly the "fake success" `review.md` warned against.
- **Real speech-to-text.** No provider credential exists in this
  environment (the same gap Stage 3 hit with `AI_PROVIDER_API_KEY`) — the
  `TranscriptionProvider` interface exists so a real adapter is a drop-in
  implementation later, not a redesign.
- Native push, device-contact permission flows, and share-sheet handoffs
  on a real device — all need the same missing mobile runtime.

When a device/simulator or CI runner with mobile testing becomes
available, the remaining Stage 7 work is: scaffold `apps/mobile`
(Expo/React Native) importing `packages/domain`/`packages/brand`; build
the voice-capture record → upload → transcribe → review screens against
the already-built schema and domain contracts; wire device contacts
(reusing Stage 4's CSV/vCard-adjacent parsing logic) and share-sheet
handoffs (reusing Stage 3's WhatsApp/SMS/email URL-building logic); then
verify the exit gate's on-device journeys for real.

## Stage 8 — deliberately skipped this round

Put to the user directly before starting: proceed with Stage 8
(billing/entitlements/admin console, building what's genuinely verifiable
without a real payment-provider account, per the pattern used for every
other credential-gated stage) or skip it for now. The user chose to skip
it and go straight to Stage 9 hardening instead. Nothing in Stage 8 exists
— no `plans`/`entitlements`/`usage_ledger` tables, no billing provider
interface, no support console. This is a scope decision, not a technical
blocker; see the dependency map above for why Stage 8 doesn't block 2–7,
and note that Stage 9's own hardening pass therefore has nothing to
harden yet for billing, entitlements, or admin surfaces specifically —
covered instead for every stage that *does* exist (0–7).

## Stage 9 remaining work

Security/RLS-performance hardening (a real role-self-escalation bug found
and fixed, plus five smaller findings), an accessibility pass (one real
contrast bug found and fixed live, nine screen-reader issues fixed by
manual review), an i18n formatting foundation, a retention policy for two
previously-unbounded tables, and four new operational docs
(`docs/disaster-recovery.md`, `docs/data-protection.md`,
`docs/production-readiness.md`, `docs/launch-plan.md`) are done and
verified — see `docs/stage-reports/stage-9.md` for the full log.

**Genuinely open, not silently skipped:**

- **Whether this Supabase project has automatic backups/PITR at all is
  unconfirmed** — the single highest-priority item out of this stage, and
  a real production risk if the project is on Supabase's Free tier (no
  automatic backups). See `docs/disaster-recovery.md`. Needs the account
  owner to check the Supabase Dashboard's plan/add-ons.
- **A real backup/restore drill was not performed** — the only two
  mechanisms available (`create_branch`, `restore_project`) either can't
  copy production data (so couldn't prove anything about data restore) or
  operate destructively on the live project with a real user on it. See
  `docs/disaster-recovery.md` for the full reasoning.
- **A real Content-Security-Policy was not added** — only
  CSP-independent baseline headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Strict-Transport-Security`,
  `Permissions-Policy`). A real CSP needs nonce wiring verified
  page-by-page in a real browser.
- **Authenticated pages were reviewed manually, not live-scanned** — no
  service-role key or real inbox exists in this environment to mint an
  authenticated browser session (and brute-forcing the OTP hash to get
  one was deliberately ruled out as an auth-bypass technique, not a
  legitimate test method). The two pages reachable without a session were
  live axe-core-scanned and are clean.
- **No error-monitoring provider, no `CRON_SECRET`/VAPID/AI keys set** —
  same known blockers as earlier stages, re-confirmed still open; see
  below.
- **Full i18n (translated UI strings, a second locale), app-store launch
  assets, a support console** — real, larger, separately-scoped work
  (Stage 7/8-adjacent in the last case) rather than something to build
  speculatively inside a hardening pass.

## Known blockers (do not silently skip; re-check each stage)

- **Live Supabase project connected, but without its service-role key in
  this environment.** Project `gzldzzianiwoivszkopk` (eu-west-2) has all
  migrations applied and was used to verify RLS cross-user isolation, the
  `claim_outbox_job` grants, and the reminder-discovery/cancel-on-edit
  pipeline for real — see `docs/stage-reports/stage-1.md` and `stage-2.md`.
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are in
  `apps/web/.env.local` (gitignored). `SUPABASE_SERVICE_ROLE_KEY` isn't
  exposed by the Supabase connection tool used to provision it, so
  service-role-only code (`createPostgresOutboxStore`, the two
  `/api/cron/*` routes, `deleteAccount`) is unit-tested with mocks and
  verified at the SQL level, but the actual Next.js route handlers
  couldn't be invoked end-to-end here. Whoever has that key next should
  add it and exercise those routes for real. A real user has since signed
  up and used magic-link sign-in against this project — see the next item.
- **Magic-link sign-in replaced with a 6-digit code — one manual dashboard
  step still required.** The error-surfacing fix in
  `docs/decisions/0007-magic-link-error-surfacing.md` didn't resolve the
  underlying failure: the same real user hit the identical symptom again
  afterward, confirming the link itself (not this app's error handling)
  was the problem — almost certainly an email-client link-scanner
  consuming the single-use link before the user's own click. Per
  `docs/decisions/0009-otp-code-sign-in.md`, `/login` now asks for a typed
  6-digit code instead of sending a clickable link.
  **This only fully takes effect once someone edits the Supabase
  project's "Magic Link" email template** (Dashboard → Authentication →
  Email Templates → Magic Link) to show `{{ .Token }}` as plain text and
  remove the `{{ .ConfirmationURL }}` link entirely — this environment has
  no tool for editing Auth email templates, so this is a manual step for
  whoever has dashboard access. Until that template is updated, the user
  will keep receiving the old link-based email even though the app code
  no longer relies on it. The project has separately been configured with
  Brevo as a custom SMTP provider for better deliverability — that fixes
  *sending*, not the link-prefetching problem, so the template change is
  still required.
- **Whether this Supabase project has any automatic backups is
  unconfirmed** (added Stage 9). Supabase's Free tier has none at all;
  Pro and above get daily backups by default with PITR as an add-on. This
  environment's tools don't expose the project's billing plan. Check
  Supabase Dashboard → Project Settings → Add-ons/Backups — if the
  project is on Free (likely, given no billing setup appears anywhere
  else in this repo's history), there is currently no way to recover from
  data loss beyond what users re-enter themselves. See
  `docs/disaster-recovery.md`.
- **`CRON_SECRET` needed for the reminder scheduler.** `/api/cron/discover-reminders`
  and `/api/cron/process-outbox` 401 without a matching
  `Authorization: Bearer <CRON_SECRET>` header. Set it in the deployment
  environment and Vercel will send it automatically for the crons defined
  in `apps/web/vercel.json` (see Vercel's cron-job docs for the exact
  mechanism); without it, reminders are never discovered or delivered even
  though everything else works.
- **Web push has real VAPID keys generated nowhere yet.** `VAPID_PUBLIC_KEY`/
  `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`/`NEXT_PUBLIC_VAPID_PUBLIC_KEY` are
  all unset in every environment so far — push falls back to the
  console/log adapter everywhere, including in this environment's
  verification. Generate a real pair (`npx web-push generate-vapid-keys`)
  before push notifications can actually reach a browser.
- **Device-contact picker not verified on a real device.** The Stage 4
  import wizard's "Import from this device's contacts" button uses the W3C
  Contact Picker API, supported today only on Chrome for Android — no
  mobile Chrome browser exists in this environment to confirm it actually
  opens the picker and returns real contacts. `isAvailable()` correctly
  hides the button everywhere else, so the worst case elsewhere is just a
  missing button, not a broken one.
- **Supabase's "Leaked Password Protection" advisory is disabled** —
  surfaced by `get_advisors` but not acted on, since Noyala only supports
  passwordless (magic-link) sign-in; this setting only affects
  password-based auth, which this app doesn't use. Revisit if password
  sign-in is ever added.
- **Migration version numbers won't match if this repo is later `supabase
  link`ed to project `gzldzzianiwoivszkopk`.** Migrations were applied via
  the Supabase management API, which timestamps them at apply time, not
  with the filenames' embedded timestamps. Reconcile with
  `supabase migration repair` rather than re-running `supabase db push`
  blind.
- **No AI provider key.** `AI_PROVIDER_API_KEY` (OpenAI) is unset
  everywhere, so message generation always uses the deterministic demo
  generator — real, distinct-per-generation, but not live AI output.
  Whoever adds a key next should generate one real message via Message
  Studio and confirm it comes back as three genuinely different options
  before calling the OpenAI adapter "verified" (`docs/integrations.md`).
- **Send handoff links untested on a real device.** The WhatsApp/SMS/email
  links Message Studio opens (`wa.me`/`sms:`/`mailto:`) are implemented
  but never confirmed against a real phone/app combination — no
  device/browser available in this environment for that.
- **No mobile app yet.** `apps/mobile` is not created until Stage 7;
  `packages/domain` is kept framework-free specifically so that stage
  doesn't require reworking shared logic.
