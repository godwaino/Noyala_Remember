# Data protection

Master Build Prompt Stage 9 asks for "data-protection documentation and
operational request workflows." This documents what's actually built and
self-service today, what's schema-ready but not yet wired up, and how an
operational request (one a user can't fully self-serve) is handled in the
absence of Stage 8's support console.

## Self-service, built and live (Stage 2)

A signed-in user can do all of the following themselves, today, with no
support intervention:

- **Export their data** — `/api/export/people`, `/api/export/important-dates`,
  `/api/export/memories` (CSV) and `/api/export/people-vcard` (vCard).
  Each route requires an authenticated session and returns only that
  user's own rows (RLS-scoped query, not just an application-level
  filter). This is the self-service form of a "right to access"/data
  portability request.
- **Delete a person** — cascades to that person's `important_dates`,
  `memories`, `message_drafts`, `message_history`, `interactions`,
  `follow_ups`, `gift_ideas` via `ON DELETE CASCADE`; `person_shares`
  referencing them are removed too. `voice_captures`/`gift_ideas.person_id`
  are the two deliberate exceptions (`ON DELETE SET NULL` — see
  `docs/permissions.md`), so a recording or gift idea outlives the person
  it was about rather than silently vanishing.
- **Delete their account** — `deleteAccount`
  (`apps/web/src/server/account/actions.ts`) calls
  `serviceRole.auth.admin.deleteUser(user.id)` after a typed "DELETE"
  confirmation. Deleting the `auth.users` row cascades everything else
  the user owns (every user-owned table's `user_id` FK is `ON DELETE
  CASCADE` — see `docs/architecture.md`). This has not been exercised
  end-to-end in this environment (no `SUPABASE_SERVICE_ROLE_KEY` — see
  `docs/roadmap.md`'s "Known blockers"), only unit-tested with a mocked
  admin client.

## Schema-ready but not yet operational: consent

The `consents` table (`granted_at`/`withdrawn_at` per `consent_type` —
`memory_ai_usage`, `contact_import`, `marketing_updates`) has had RLS
since Stage 1 and is listed in `docs/permissions.md`'s matrix as
"Owner: grant/withdraw." A repo-wide search found **no application code
anywhere reads or writes this table** — no onboarding checkbox, no
settings toggle, nothing calls it. This is the same "schema exists,
feature not built" gap the Stage 9 security audit found in
`voice_captures`' file-storage code — worth naming explicitly rather than
letting `docs/permissions.md`'s matrix imply it's live when it isn't.

**What this means today:** the app does not yet obtain or record explicit,
revocable consent for AI usage, contact import, or marketing
communications as distinct, trackable events — sensitive-memory exclusion
from AI generation (Stage 3) is a per-request UI choice, not a standing
consent record, and contact import (Stage 4) has no consent gate at all
beyond the user initiating the import themselves. Building the actual
onboarding/settings UI for this is real, scoped follow-up work, not
something to guess at speculatively here.

## Operational requests (no support console yet — Stage 8 not built)

Stage 8 (commercial platform/admin, including a "least-privilege support
console with redacted diagnostics") hasn't been built. Until it exists,
an operational privacy request that a user can't fully self-serve — e.g.
someone emailing to ask for their data or deletion because they've lost
access to their account — has to be handled directly by whoever holds
Supabase project access (the account owner), by hand, via SQL:

1. **Access/export request**: confirm the requester's identity (matching
   email against `auth.users`), then export their rows across
   `people`/`important_dates`/`memories`/`message_drafts`/
   `message_history`/`interactions`/`follow_ups`/`gift_ideas`/
   `circles`/`circle_members` scoped to their `user_id` — the same tables
   the self-service export routes already query, run directly instead of
   through the app.
2. **Deletion request**: prefer directing the requester to sign in and use
   the in-app "Delete account" flow themselves — it's the same effect
   with no manual step. Only if they can't sign in at all should
   `auth.admin.deleteUser` be run directly via the Supabase Dashboard or
   Admin API, after identity confirmation.
3. **Consent withdrawal request**: not yet operational (see above) —
   until the UI exists, this can only be recorded as a manual note
   against the account, not as a structured, queryable `consents` row.

This manual process is a real gap for anyone other than the account
owner to execute — it needs the exact least-privilege support console
Stage 8 describes ("support roles cannot view personal content by
default") to be handled by anyone else safely. Flagging as a genuine
open item for Stage 8, not resolving it here.

## What's never sent anywhere it shouldn't be

- Sensitive memories are excluded from AI message generation by default —
  only included when explicitly checked per-generation (Stage 3,
  re-verified in Stage 9's security audit).
- Logs never carry memory content, message bodies, or contact fields by
  name (`apps/web/src/server/logger.ts`'s `REDACTED_KEYS`), and — since
  Stage 9 — also scrub any email-shaped substring found in any other
  field value, closing the gap where a caught error message or a
  provider's raw error response could otherwise echo one back. See
  `docs/decisions/` for the specific bug this closed.
