# Stage 5 — Relationship care

## Delivered

### Schema (`interactions`, `follow_ups`, `people` extension)
- `interactions`: type (call/visit/message/meeting/other), `occurred_at`,
  optional summary, `source` (only `'manual'` today — mirrors `memories`'
  pattern so a future connected source doesn't need a schema change to be
  distinguishable from what the user typed themselves).
- `follow_ups`: description, optional `due_at`, status
  (open/completed/dismissed), an optional link back to the interaction it
  arose from. Composite FKs to `people(id, user_id)` and
  `interactions(id, user_id)` for the same cross-record isolation
  guarantee every other table in this schema has.
- `people.reconnect_cadence_days` (nullable — no cadence means never
  suggested) and `people.reconnect_snoozed_until` (the snooze control).
- **No score, streak, ranking or percentage column exists anywhere in this
  migration** — Master Build Prompt §4's "without gamifying relationships"
  / "without penalty scores or shame-inducing streaks" is met structurally,
  not just by UI choice. See `docs/product.md`.

### Domain logic (`packages/domain/src/relationship-care.ts`)
- `getReconnectStatus`: a person is due when a cadence is set, they aren't
  currently snoozed, and either nothing has ever been logged or at least
  `cadenceDays` have passed since the last interaction. No cadence set
  means never due — opt-in per person.
- `bucketFollowUp`/`sortFollowUpsForDisplay`: plain overdue/due-soon/later/
  undated buckets, earliest first within each — no weighting or scoring.
- Pure, framework-free, unit-tested independent of any database.

### UI
- **Person detail page**: a conversation-prep card (next upcoming date +
  recent memories, sensitive ones excluded by default with an explicit
  "show N sensitive details" reveal — never silently included), an
  interaction log with inline logging, and an open-follow-ups list with
  add/complete/dismiss actions.
- **Home page**: a "Reconnect" section (people due, each showing "last
  contact N days ago · every M days" and a snooze button) and a
  "Follow-ups due" section (overdue and due-soon items, complete/dismiss
  inline). Every suggestion states its reason inline, satisfying the exit
  gate's "suggestions reveal why they appeared and can be disabled."
- **Person form**: an optional reconnect-cadence field (None/2 weeks/
  month/2 months/3 months/6 months).

## Verification against the live project

Seeded two throwaway users directly against the live Supabase project,
using the RLS-scoped `authenticated` role:

- Created a person with a 30-day cadence, an interaction 40 days in the
  past, and a follow-up linked to that interaction — confirmed the
  composite FK to `interactions(id, user_id)` works (this is the first
  table in the schema to reference another table's composite key rather
  than just `people`'s).
- Updated `reconnect_snoozed_until` (mirrors the snooze action) and a
  follow-up's status to `completed` (mirrors complete/dismiss) — both
  succeeded as the owning user.
- Confirmed a second user can see none of the first user's interactions or
  follow-ups, and that user's delete attempts against the first user's
  rows (scoped to their own `user_id`, mirroring how the app's own delete
  actions are written) affected zero rows.
- Deleted the person and confirmed both the interaction and the follow-up
  cascaded away with it (`on delete cascade` from `people`).
- All seeded rows removed afterward; confirmed the real user's account was
  untouched throughout. `get_advisors` shows no new findings beyond the
  three pre-existing ones from earlier stages.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean.
- `pnpm -r test` — 151/151 passing (115 in `@noyala/domain`, up from 101:
  +14 for `relationship-care.ts`; 36 in `@noyala/web`, unchanged — the new
  server actions follow this codebase's convention of verifying
  `getSupabaseServerClient()`-based actions live rather than with mocks).
- `pnpm --filter @noyala/web build` — succeeds; `/people/[personId]` and
  `/` both grew as expected for the new client components, no new routes
  needed (everything lives on existing pages).

## Known limitations

- **Reconnect/follow-up reminders are in-app only**, not wired into the
  Stage 2 email/push pipeline — a deliberate scope decision, not a gap;
  see `docs/roadmap.md`'s "Stage 5 remaining work" for what a follow-up
  slice would need.
- **"Interactions capture" is manual-entry only** — no connected calendar,
  call log or messaging platform can log one automatically yet (would need
  the same kind of OAuth credentials Stage 4's cloud contact providers are
  blocked on). The `source` column is already shaped for this, so adding
  one later doesn't need a schema change.
- No accessibility-specific re-audit of the new forms/lists — same
  informal-only status carried since Stage 2.

## What's next

Stage 5's full deliverable list (interaction capture, follow-up
commitments, optional reconnect cadence, conversation-prep cards,
explainable/dismissible/snoozable suggestions with no scores or streaks)
is built and verified. See `docs/roadmap.md` for Stage 6 onward.
