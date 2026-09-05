# Noyala — Permission matrix

Requested by `review.md`: "Define an explicit permission matrix for owned,
shared and collaborative records. Separate permission to view from
permission to edit, share, export and use in AI." This is that matrix,
kept current as each stage adds a new access mode. Where a stage hasn't
been built yet, the row says so explicitly rather than guessing ahead of
its design.

## Today (Stages 0-2): single-owner only

No sharing exists yet — every row below is `user_id = auth.uid()` via Row
Level Security (see `docs/architecture.md`). There is exactly one
principal per record: its owner.

| Resource | View | Edit | Delete | Export | Use in AI |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Owner | Owner | Owner (via delete-account only — see `docs/state-transitions.md`) | Owner | n/a |
| `people` | Owner | Owner | Owner | Owner | n/a (see `important_dates`/`memories`) |
| `important_dates` | Owner | Owner | Owner | Owner | n/a until Stage 3 |
| `memories` | Owner | Owner | Owner (soft: archive; hard: cascades from person delete) | Owner | **Not yet enforced at the code level** — Stage 3 must exclude `sensitivity = 'sensitive'` by default and require explicit per-generation inclusion (Master Build Prompt §8, `docs/product.md`) |
| `message_drafts` / `message_history` | Owner | Owner (drafts only; history is append-only) | Owner | Not yet exposed | n/a — this *is* AI output, not AI input |
| `notification_deliveries` | Owner (read-only) | Service role only | Service role only | Not yet exposed | n/a |
| `outbox_jobs` | Nobody (not user data) | Service role only | Service role only | n/a | n/a |
| `consents` | Owner | Owner | Owner (withdraw, not delete — see state transitions) | Owner | n/a |

Cross-record isolation (a row carrying the right `user_id` but pointing at
someone else's `person_id`) is prevented at the schema level, not just by
convention: `important_dates`, `memories`, `message_drafts` and
`message_history` all carry a composite foreign key on
`(person_id, user_id)` against a matching unique constraint on `people`,
so such a row cannot exist even if application code had a bug. Verified
live by attempting exactly that cross-reference against the seeded test
users — see `docs/stage-reports/stage-1.md` and `stage-2.md`.

## Stage 6: shared circles and gifting

Built and verified live against the real Supabase project — see
`docs/stage-reports/stage-6.md` for the full test log. The design
questions this section used to pose (before any migration existed) are
answered here as implemented, not as intent.

**Roles** (Master Build Prompt §11): `owner`, `organiser`, `viewer` on
`circle_members`. Role is fixed at invitation time; there is no in-place
role-change RLS path — verified live that a direct `UPDATE
circle_members SET role = ...` affects zero rows even for the circle
owner. Changing someone's role is revoke-and-reinvite by design.

| Resource | View | Edit/Manage | Notes |
| --- | --- | --- | --- |
| `circles` | Owner, or any accepted member | Owner only (rename/delete) | Member visibility via `is_circle_member()` — see the RLS-recursion note below |
| `circle_members` | Owner, or any accepted member (peer visibility) | Self (own row, e.g. `linked_person_id`); owner can remove anyone; anyone can remove themselves (leave) | No role-change path at all |
| `circle_invitations` | Owner/organiser of the circle; the invitee (by email) | Owner/organiser send/revoke; invitee can decline | **Accepting** never goes through a plain RLS-authorized UPDATE — only `accept_circle_invitation()` (SECURITY DEFINER) can move a row to `accepted`, so a member row can never exist without a matching accepted invitation |
| `person_shares` | Owner of the person; any member of the target circle | Owner/organiser only may create a share; only the sharing owner may change flags or revoke | Circle-scoped, not per-member: sharing a person makes them visible to every accepted member of that circle |
| `people` (shared) | Any member of a circle the person is actively shared into | View only — no edit/delete path exists for a non-owner | Additive RLS policy, the existing owner-only policy is untouched |
| `important_dates` (shared) | Same as `people` — sharing a person always includes their dates | View only | Dates carry no separate share flag; they aren't the "private notes" the exclusion list is about |
| `memories` (shared) | Same as `people`, **and** only when `sensitivity = 'standard'` **and** the share's `share_memories = true` | View only | Both conditions are hardcoded in the RLS `USING` clause — a sensitive memory is never visible to a circle member no matter how the share is configured. Verified live: turning `share_memories` on exposes exactly the standard memory, never the sensitive one. |
| `gift_ideas` | Any member of the circle the person is shared into, with `share_gift_planning = true`, **except** the member whose own `linked_person_id` is that gift's recipient | Any qualifying member may create/update (collaborative); delete is creator or circle owner/organiser | The recipient-exclusion applies unconditionally, not as an opt-in — verified live that the linked member sees zero rows for gifts about themselves while every other qualifying member sees them |

**Edit vs. share for a non-owner:** not separable — a non-owner circle
member gets view (plus gift planning, which is deliberately open to every
role) and nothing else. There is no server-enforced path for a
shared-with viewer/organiser to edit a person's own fields, dates, or
memories; only gift-idea rows are writable by non-owners.

**Surprise-gift visibility**: `circle_members.linked_person_id` lets a
member self-identify "this shared person record is me." `gift_ideas`
RLS then excludes any row whose `person_id` matches the *viewing* member's
own `linked_person_id` for that circle — a condition on the viewer, not
the record owner, exactly as this section originally called for.

**A real RLS bug found by live testing, not code review**: the first
version of `circle_members`'s own "peer visibility" policy queried
`circle_members` from within its own policy body. Postgres does not
reliably short-circuit self-referential RLS subqueries — it re-evaluates
the full OR'd policy set on every nested scan of the same table — so this
produced "infinite recursion detected in policy" (42P17) on every insert
or select touching the table. Fixed with a `SECURITY DEFINER` helper
function (`is_circle_member`), the same pattern already used for
`claim_outbox_job`/`accept_circle_invitation`, which bypasses the table's
own RLS instead of recursing into it. See
`docs/decisions/0011-circle-membership-rls-recursion.md`.

## Stage 7: voice capture and extracted memory candidates

Owner-only throughout — no sharing exists for these tables (a voice note
is not a `person`, so Stage 6's circle-sharing policies don't apply here
at all).

| Resource | View | Edit | Delete | Notes |
| --- | --- | --- | --- | --- |
| `voice_captures` | Owner | Owner | Owner | `person_id` is a plain, nullable FK (`on delete set null`) — deleting the linked person un-links the recording rather than destroying it, matching `gift_ideas.person_id`'s Stage 6 precedent for the same reason: this is not a "the row structurally belongs to that person" relationship. |
| `extracted_memory_candidates` | Owner | Owner (review: accept/reject) | No delete policy — rows only disappear via `voice_capture_id`'s cascade | Reviewing is an update (`status` → `accepted`/`rejected`), not a delete, keeping an audit trail of what was proposed and decided — same soft-state pattern as `consents`/`circle_invitations`. |

**Independent deletion, verified live**: deleting the audio
(`storage_path = null`, `audio_deleted_at = now()`) leaves the transcript
and any already-accepted `memories` rows untouched; deleting the
`voice_captures` row itself cascades its `extracted_memory_candidates`
bookkeeping rows away but does **not** touch memories already created from
an accepted candidate — those stand on their own once created. See
`docs/stage-reports/stage-7.md`.

## Not yet built — filled in when each stage lands

**Stage 4 (contact sync) / Stage 8 (billing/admin):** support-staff and
integration-service access levels (Master Build Prompt §14: "Support
staff must not see message bodies, contact details or memories by
default") — not designed yet; needs its own row set once the admin
console exists.
