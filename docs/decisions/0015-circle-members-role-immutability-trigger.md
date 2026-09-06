# 15. Enforce circle_members role immutability with a trigger, not RLS

Date: 2026-09-06

## Status

Accepted

## Context

`circle_members_update_self` (`supabase/migrations/20260905000600_circle_members.sql`)
was written with the comment "A member may update only their own row (in
practice: self-identifying `linked_person_id`). Role changes go through
revoke-and-reinvite, not an edit, for this stage" — but its actual
`USING`/`WITH CHECK` clauses only ever scoped *which row* (`user_id =
auth.uid()`), never *which columns*.

Stage 9's security audit found this meant any authenticated circle member
— viewer or organiser — could call
`supabase.from('circle_members').update({ role: 'owner' }).eq('id',
<their own membership row id>)` directly. Both `USING` and `WITH CHECK`
still evaluate true (`user_id = auth.uid()` never changes), so the update
succeeds: the member self-promotes to `owner`, then can rename/delete the
circle, remove any other member (`circle_members_delete_self_or_owner`
trusts `role`), and manage every `person_shares`/`gift_ideas` row for it.
`docs/permissions.md`'s claim that a direct role `UPDATE` "affects zero
rows even for the circle owner" was verified only for the owner updating
*someone else's* row (correctly blocked); a member updating their *own*
row's `role` was never tested and was not actually blocked.

## Decision

Enforce it with a `BEFORE UPDATE` trigger
(`circle_members_prevent_identity_change`) that raises if `role`,
`circle_id`, or `user_id` differ between `OLD` and `NEW`, rather than by
tightening the RLS policy's `WITH CHECK`. A `WITH CHECK` fix would need to
compare the new `role` against the row's *existing* role via a
self-referencing subquery against `circle_members` — the exact
self-reference pattern that already caused the infinite-recursion bug
fixed in this same migration's later follow-up
(`docs/decisions/0011-circle-membership-rls-recursion.md`). A trigger
compares `OLD`/`NEW` directly with no subquery, and — deliberately —
applies to every role including `service_role`, since no code path
legitimately changes a member's role in place today either.

## Consequences

- `linked_person_id` (the one column this policy was actually meant to
  allow editing) is unaffected — only `role`/`circle_id`/`user_id` are
  now immutable via `UPDATE`.
- If a future feature needs to change a member's role in place (rather
  than revoke-and-reinvite), it must either go through a new
  `SECURITY DEFINER` function (bypassing this trigger deliberately, like
  `accept_circle_invitation` bypasses `circle_members`'s RLS) or this
  trigger must be revisited — it is not something a plain client
  `UPDATE` can ever satisfy again.
- `docs/permissions.md` is corrected to describe what is actually
  enforced (a trigger, not "affects zero rows" by RLS alone) and to state
  the self-row case explicitly.
