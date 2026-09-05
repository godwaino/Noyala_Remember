# Stage 4 — Connected contacts and communication

## Scope for this slice

This environment has no OAuth app credentials for Google/Apple/Microsoft
contacts, no real WhatsApp Business API/Twilio account, and no mobile app
yet (`apps/mobile` is Stage 7). Rather than write untestable scaffolding
against providers that don't exist, this slice covers what's genuinely
buildable and verifiable: one-way CSV/vCard import, a real (if
narrowly-supported) device-contact adapter, and an editable notification
preference centre. Cloud OAuth adapters and direct/scheduled send stay
explicitly **not started** — see `docs/roadmap.md`'s "Stage 4 remaining
work" for why building their contracts now would just be the "unused
speculative" scope the Master Build Prompt says to avoid.

## Delivered

### CSV/vCard import (`packages/domain/src/contact-import.ts`, `/people/import`)
- A hand-rolled RFC-4180-ish CSV parser (quoted fields, embedded commas/
  newlines, doubled-quote escaping) and a vCard parser (N/FN/NICKNAME/TEL/
  EMAIL/NOTE/BDAY, including RFC 6350 line-unfolding and backslash-escape
  handling for `;`/`,`/`\n`).
- Field mapping with alias-based guessing (e.g. "Email Address" → `email`)
  that the user can override before import.
- Loose birthday parsing (`YYYY-MM-DD`, vCard's compact `YYYYMMDD`,
  `MM/DD/YYYY`, and the yearless `--MMDD` form), each candidate becoming a
  `birthday` type import row that creates an `important_dates` row on
  confirm.
- Duplicate detection against the user's existing people (email, then
  phone, then normalized full name) — flagged and unchecked by default in
  the preview, overridable per row.
- The entire upload → field-mapping → preview flow runs client-side using
  the same pure domain functions a server action would otherwise call — no
  staging table, no import-session id. See
  `docs/decisions/0010-client-side-import-parsing.md`.
- **One-way only, by construction**: `confirmImport` always inserts new
  `people` rows and never updates an existing one, so Master Build Prompt
  §10's "no import overwrites newer user data silently" exit-gate
  requirement holds structurally rather than needing conflict-resolution
  logic.
- **Undo window**: the result page after import offers "Undo this import,"
  which deletes exactly the ids that import just created, scoped to the
  owning user.

### Device-contact adapter (`packages/domain/src/device-contacts.ts`, `apps/web/src/components/browser-contact-picker.ts`)
- `DeviceContactProvider` contract (framework-free, in `packages/domain`)
  satisfies Master Build Prompt §10's "native-device contact adapter
  contract" requirement; a future Expo/React Native implementation
  (Stage 7) would satisfy the same contract without the import wizard
  changing.
- The "test implementation" the master prompt asks for is a real one: the
  W3C Contact Picker API (`navigator.contacts.select`), feature-detected
  via `isAvailable()` so the entry point simply doesn't appear on browsers
  that don't support it (desktop, iOS Safari) rather than showing a button
  that always fails.

### Notification preference centre (`/settings`, `apps/web/src/server/profile`)
- `preferredReminderChannel` and `defaultReminderOffsets` — previously only
  ever set once, at onboarding — are now editable afterward from Settings.

## Verification against the live project

Seeded a throwaway user (and a second, for cross-user isolation checks)
directly against the live Supabase project, using the RLS-scoped
`authenticated` role:

- Inserted two people the way `confirmImport` does, plus a birthday
  `important_dates` row for one of them — succeeded once a real bug found
  during this exact verification was fixed (see below).
- Confirmed a second user can see neither via a plain `select` (RLS).
- Ran the exact delete `undoImport` performs (scoped to `user_id` + the
  specific ids) — both the person rows and the cascaded birthday date were
  gone afterward; confirmed the second user's identical delete attempt
  against the first user's rows affected zero rows first.
- Updated `preferred_reminder_channel`/`default_reminder_offsets` on the
  seeded profile as its owner — succeeded; the second user's identical
  update against the first user's profile affected zero rows.
- All seeded rows removed afterward; confirmed the real user's account and
  data were untouched throughout, and `get_advisors` shows no new findings
  (no new migrations were needed this stage).

**Real bug found and fixed by this verification**: `confirmImport`'s
birthday insert didn't clamp `important_dates.year` to the table's
`between 1900 and 2100` check constraint before inserting. A candidate
with a birth year outside that range (a plausible thing to encounter in a
real vCard/CSV export) would have made the *entire* birthday-insert batch
fail with an unhandled constraint violation — the people themselves would
still be created, but every birthday in that batch would silently be lost,
not just the one bad row. Fixed to drop only that one row's year (keeping
month/day) when it's out of range, matching the same range
`importantDateInputSchema` already enforces for manual entry.

The device-contact picker (Contact Picker API) and the WhatsApp/SMS/email
handoff links from Stage 3 remain unverified against a real device/browser
combination — no mobile Chrome available in this environment. See
`docs/integrations.md`.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean.
- `pnpm -r test` — 137/137 passing (101 in `@noyala/domain`, up from 74:
  +27 for `contact-import.ts`; 36 in `@noyala/web`, unchanged — the new
  server actions call `getSupabaseServerClient()` directly and are
  verified live instead, matching every other action module's convention
  in this codebase).
- `pnpm --filter @noyala/web build` — succeeds; `/people/import` and
  `/people/import/result` are correctly dynamic.

## Known limitations

- Cloud contact OAuth adapters and direct/scheduled send providers are not
  started — genuinely blocked on credentials this environment can't
  create, not merely deferred. See `docs/roadmap.md`.
- The device-contact picker and CSV/vCard import's real-world file
  compatibility (actual exports from Google Contacts, Apple Contacts,
  Outlook) haven't been tried against a real exported file from any of
  those services — only against hand-written fixtures matching the
  documented formats.
- No import size/rate limiting beyond a flat 1000-row cap per batch — not
  a validated product number, a technical safety default (see
  `docs/integrations.md`'s "Acceptance budgets").

## What's next

Stage 4's buildable scope (CSV/vCard import, device-contact contract,
notification preferences) is done and verified. The rest of Stage 4 —
cloud contact providers, direct/scheduled send, the approval-policy tables
that would gate them — stays blocked until real provider credentials
exist; see `docs/roadmap.md` for Stage 5 onward.
