# 17. account_deletion_requests has no "completed" status — the cascade is the completion record

Date: 2026-09-09

## Status

Accepted

## Context

The web redesign replaced immediate account deletion
(`auth.admin.deleteUser`, called directly from a form submission) with a
recoverable flow: a request sits in `account_deletion_requests` for a
30-day window, cancellable at any point, before a daily cron
(`processAccountDeletions`) actually erases the account.

The first draft of the schema modelled this the way most state machines
are modelled — `status in ('pending', 'cancelled', 'completed')` — with
`completed_at` alongside `cancelled_at`.

Testing that migration against a local Postgres (inserting a row,
exercising every constraint, then deleting the referenced `auth.users`
row to confirm the cascade) surfaced the actual problem: this table's
primary key is `user_id`, referencing `auth.users (id) on delete
cascade`. The moment an erasure actually succeeds, `auth.admin.deleteUser`
removes the `auth.users` row, and `account_deletion_requests` cascades
away with it. There is no point at which a row could sit in the table
with `status = 'completed'` — by the time the erasure that would set that
status has happened, the row erasing it has already deleted itself. A
`completed` status and a `completed_at` column would be schema that could
never be observed by any query, ever.

## Decision

`account_deletion_requests.status` only allows `'pending'` and
`'cancelled'`. There is no `completed_at`. A request either:

- stays `pending` until `erase_after` passes, at which point
  `processAccountDeletions` deletes the `auth.users` row and this row
  cascades away with it — the disappearance of the row *is* the
  completion record, not a status value on a row that no longer exists;
- or gets set to `'cancelled'` (with `cancelled_at`), and is kept
  indefinitely as an audit trail of the fact someone requested and then
  reversed a deletion.

If an erasure attempt fails partway (the Admin API call itself errors),
the row simply stays `pending` — `processAccountDeletions` picks it up
again on the next daily run, the same retry shape the outbox jobs already
use for transient failures.

## Consequences

- Nothing anywhere ever needs to branch on `status = 'completed'` — a
  smaller, honestly-scoped enum than the first draft.
- Auditing "was this account actually deleted" means checking that the
  `auth.users` row (and everything cascading from it) is gone, not
  querying this table — which is also the only source of truth that can't
  drift from reality, since it's the same delete that removes both.
- If a future requirement needs a durable, queryable record of completed
  deletions (e.g. for a compliance report after the user's data — and this
  row about them — no longer exists), that needs a separate table that
  does *not* reference `auth.users` with `on delete cascade`, populated by
  `processAccountDeletions` immediately before it calls
  `auth.admin.deleteUser`. Nothing here blocks adding that later; it just
  isn't this table.
