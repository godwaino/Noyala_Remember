# Stage 6 — Shared circles and gifting

## Delivered

### Schema (`circles`, `circle_members`, `circle_invitations`, `person_shares`, `gift_ideas`)
- `circles`: owner + name. Visible to its owner unconditionally, plus any
  accepted member (via `is_circle_member()` — see the RLS-recursion note
  below).
- `circle_members`: one row per accepted (circle, user), with a fixed
  `role` (owner/organiser/viewer) and a nullable `linked_person_id` — a
  member's self-identification of "which shared person record is me,"
  used only for surprise-gift hiding.
- `circle_invitations`: pending/accepted/declined/revoked, one live
  (pending) invitation per (circle, email) via a partial unique index —
  the same soft-revoke-with-audit-trail pattern `consents` already
  established. Accepting one is never reachable through a plain RLS
  `UPDATE`; only `accept_circle_invitation()` (`SECURITY DEFINER`) can move
  a row to `accepted`, atomically with creating the matching
  `circle_members` row, so a member can never exist without a matching
  accepted invitation.
- `person_shares`: grants a circle visibility into one of the owner's
  people, with two independent flags — `share_memories` (defaults
  **false**) and `share_gift_planning` (defaults **true**) — plus the same
  `revoked_at` soft-revoke pattern as `consents`.
- Additive `SELECT` policies on `people`, `important_dates` and `memories`
  layer shared visibility on top of each table's existing owner-only
  policy, which is untouched. `memories`' shared-visibility policy
  hardcodes `sensitivity = 'standard'` in the `USING` clause — not just as
  a default — so a sensitive memory is never visible to a circle member no
  matter how `share_memories` is set.
- `gift_ideas`: a single table (title, description, occasion, budget
  amount + ISO-4217 currency with a paired-or-neither constraint, deadline,
  link, status idea→planned→purchased→given, `claimed_by_user_id`).
  Deliberately scoped down from the Master Build Prompt's three-table
  `gift_ideas`/`gifts`/`gift_collaborators` split — a `given` row doubles
  as the past-gift history record the prompt asks for, and
  `gift_collaborators` (multi-person cost-splitting on one gift) is a
  well-scoped, additive follow-up if ever wanted, not built speculatively.
  Its RLS unconditionally excludes any row whose recipient matches the
  *viewing* member's own `linked_person_id` — the surprise-mode
  requirement — applied to every policy (select/insert/update), not as an
  opt-in.
- `people.gift_preferences` / `people.gift_exclusions`: durable, freeform
  gift context on the person record (not per-idea), covered by the
  existing + new `people` `SELECT` policies with no extra policy needed.

### Domain logic (`packages/domain/src/circles.ts`, `gift-planning.ts`)
- Pure role-permission predicates (`canManageCircle`, `canManageInvitations`,
  `canShareOwnPerson`, `canPlanGifts`, `canRemoveMember`) mirroring — never
  replacing — the RLS policies; used only to decide what the UI offers.
- `findLikelyDuplicateGiftIdeas`: exact-or-word-subset match on normalized
  titles, checked against every existing idea regardless of status (a
  `given` gift is still worth flagging if someone proposes it again). No
  fuzzy-matching dependency, consistent with this codebase's precedent of
  hand-rolling small pure-domain parsing/matching logic (Stage 4's CSV/vCard
  parsers) rather than adding one. Runs client-side, live as you type, in
  `GiftIdeaForm` — a warning, never a block.

### UI
- **`/circles`**: list of circles you own or belong to, pending
  invitations addressed to you (accept/decline), and a create-circle form.
- **`/circles/[circleId]`**: members (leave/remove per
  `canRemoveMember`), pending invitations with an invite form
  (owner/organiser only), a "which shared person is you?" self-link
  control, and the circle's shared-people list.
- **Person detail page**: gated by ownership for the first time — a
  circle member can now legitimately load another owner's person page
  (`people_select_shared_via_circle`), so every owner-only action
  (edit/archive/delete, write-a-message, log-interaction, follow-ups,
  dates/memories add-and-edit, recent messages) is hidden from a
  non-owner viewer, who instead sees a read-only view plus the
  collaborative "Gift ideas" section. Owners get a new "Shared with"
  section to share the person into a circle (with the two flags) and
  revoke existing shares.
- **Gift ideas section** (visible to owner and qualifying shared viewers
  alike): list with status-advance ("Claim" → "Mark purchased" → "Mark
  given") and remove (creator-only in the UI), plus the add form with live
  duplicate warnings.
- **`/gifts`**: a cross-person, cross-circle overview of every gift idea
  the signed-in user can see, linking back to each person's page for the
  actual actions.

## A real bug found by live verification, not code review

`circle_members`'s first "peer visibility" policy queried
`circle_members` from inside its own policy body. Reasoned at design time
to terminate via a sibling `user_id = auth.uid()` policy; in practice
Postgres re-evaluates the full OR'd policy set on every nested scan of the
same table with no such short-circuit, so this produced
`ERROR: 42P17: infinite recursion detected in policy for relation
"circle_members"` on the very first insert exercised against it. Fixed
with a `SECURITY DEFINER` helper (`is_circle_member`) — the same pattern
`claim_outbox_job`/`accept_circle_invitation` already use to deliberately
bypass RLS instead of recursing into it. Full writeup:
`docs/decisions/0011-circle-membership-rls-recursion.md`.

## Verification against the live project

Seeded four throwaway users (owner, organiser, viewer, an unrelated
outsider) directly against the live Supabase project, using the
RLS-scoped `authenticated` role via `set_config('request.jwt.claim.sub'
/ '...email', ...)`:

- **Circle lifecycle**: owner creates a circle + their own owner
  membership row; invites organiser and viewer by email. Confirmed a
  wrong-recipient acceptance attempt (viewer accepting organiser's invite
  token) is rejected by `accept_circle_invitation` with "invitation is not
  addressed to the current user." Both correct acceptances succeed and
  create exactly the right `circle_members` rows.
- **Peer visibility**: after the recursion fix, the viewer can see the
  circle and all three members; before the fix, this failed outright.
- **Cross-circle isolation**: a second circle owned by the unrelated
  outsider is invisible to the viewer — zero rows for both the circle and
  its membership.
- **Field-aware memory sharing**: owner creates a person with one standard
  and one sensitive memory, shares the person into the circle with
  `share_memories = false`. Organiser sees the person and its date but
  zero memories. Owner flips `share_memories = true`; organiser now sees
  exactly the standard memory — the sensitive one stays invisible. This is
  `docs/product.md`'s "private memories never become shared merely because
  a person is shared" proven live, not just by construction.
- **Surprise-gift hiding**: organiser is linked (`linked_person_id`) to
  the shared person. Viewer creates a gift idea for that person. Organiser
  sees zero gift ideas for them; owner sees one. Confirmed the exclusion
  is enforced on **insert** too — the organiser attempting to insert a
  gift idea targeting themselves is rejected by RLS, not just hidden after
  the fact.
- **Collaborative planning**: owner (not the gift's creator) advances its
  status from `idea` to `planned` and claims it — succeeds, proving gift
  planning is genuinely collaborative across users, not author-restricted.
- **Role-gated sharing**: a viewer attempting to share their own person
  into the circle is rejected by RLS (`person_shares` insert requires
  owner/organiser).
- **Member removal revokes immediately**: owner removes viewer from the
  circle; a follow-up check (as the viewer) shows zero visibility into the
  circle, the shared person, and its gift ideas — all in the same request
  cycle, no caching or delay.
- **Revocation revokes immediately**: owner revokes the person share;
  organiser's visibility into the person, its memories and its gift ideas
  all drop to zero.
- **Invitation revocation blocks acceptance**: a revoked invitation's
  token can no longer be accepted — `accept_circle_invitation` raises
  "invitation not found or no longer pending."
- **No in-place role change**: owner attempts a direct
  `UPDATE circle_members SET role = 'owner' ...` on the organiser's row —
  affects zero rows, confirmed by a role-neutral (`reset role`) check
  afterward, not by re-querying as the acting user (the mistake corrected
  during Stage 5's verification and deliberately avoided here throughout).
- All seeded rows and all four fake `auth.users` removed afterward;
  confirmed the real user's account was the only one left.
  `get_advisors` shows the recursion fix's new function
  (`is_circle_member`, `SECURITY DEFINER`, callable by `authenticated`) as
  an expected, reviewed finding in the same category as
  `accept_circle_invitation` — no new unreviewed findings.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean except one pre-existing-pattern warning
  (`_prevState` unused in `acceptInvitation`, which only takes an extra
  trailing arg to match `useActionState`'s call signature) — 0 errors.
- `pnpm -r test` — 164/164 passing (128 in `@noyala/domain`, up from 115:
  +6 for `circles.ts`, +7 for `gift-planning.ts`; 36 in `@noyala/web`,
  unchanged).
- `pnpm --filter @noyala/web build` — succeeds. `/circles` and
  `/circles/[circleId]` are new routes; `/gifts` moved from a static stub
  to a dynamic route; `/people/[personId]` grew for the new
  ownership-gated sections.

## Known limitations

- **Invitation "expiry" is revocation, not a TTL.** The Master Build
  Prompt's exit gate says "expiry"; this implementation has no
  `expires_at` column — an invitation stays pending until the
  owner/organiser explicitly revokes it or it's accepted/declined. Adding
  a real TTL later is a small additive migration (one nullable timestamp +
  one extra check in `accept_circle_invitation`), not a redesign.
- **Role changes are revoke-and-reinvite**, not in-place editing — a
  deliberate simplification (verified live: direct role updates are
  rejected for everyone, including the owner), documented in
  `docs/permissions.md`, not an oversight.
- **No merchant/affiliate gift adapter.** The exit gate only requires
  gifting to "remain useful without a merchant integration," which it is;
  there's no real provider to integrate against yet, so nothing was built
  speculatively.
- No accessibility-specific re-audit of the new forms/lists — same
  informal-only status carried since Stage 2.

## What's next

Stage 6's full deliverable list (circle roles/invitations/membership,
field-aware person/date/memory sharing, collaborative gift planning with
enforced surprise-mode, duplicate-gift warnings, budgets/currencies/
deadlines/status tracking) is built and verified, including the
exit gate's explicit "policy-level tests" for cross-circle access, role
changes and revocation. See `docs/roadmap.md` for Stage 7 onward.
