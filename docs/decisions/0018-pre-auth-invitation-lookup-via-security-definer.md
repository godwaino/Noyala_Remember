# 18. Pre-auth invitation lookup goes through a SECURITY DEFINER function, not a new RLS policy

Date: 2026-09-09

## Status

Accepted

## Context

`/invite/[token]` is deliberately reachable before sign-in — someone
clicks the link, sees what circle they're being invited to, and only
then decides whether to sign in and respond. Rendering that page needs
to look `circle_invitations` up by token.

Every existing `circle_invitations` RLS policy requires either managing
the circle (`circle_invitations_select_manager`) or being signed in as
the invitee (`circle_invitations_select_invitee`, matching
`auth.email()`). An anonymous visitor holding just the link satisfies
neither — there was, correctly, no path for `anon` to select this table
directly. The obvious-looking fix — add a third select policy scoped to
`anon`, gated by knowing the token — doesn't fit Postgres RLS well: a
`select` policy's `using` clause can't reference the row being matched
against a value from the query itself (the token) the way a function
parameter can, so it would have to fall back to `true` (any anon select
allowed) and rely entirely on the app-layer query always filtering by
token — one missed `.eq("token", …)` in any future query against this
table, and the whole table becomes anon-readable.

## Decision

Added `get_circle_invitation_by_token(uuid)`, a `SECURITY DEFINER`
function (same pattern as the existing `accept_circle_invitation`),
granted to `anon` and `authenticated`, revoked from `public`. It:

- looks up the invitation by token internally, with the function's own
  elevated privileges — no RLS policy change needed at all;
- returns only a derived `state`
  (`valid`/`expired`/`withdrawn`/`accepted`/`invalid`) plus `circle_name`,
  `invited_email`, `role` and `expires_at` — never `invited_by_user_id`,
  never anything about other circle members, never the raw `status`
  column (folding in the expiry check itself, so the page never
  duplicates that logic);
- returns exactly one row always, with every field but `state` null when
  the token matches nothing (`state: 'invalid'`) — never a Postgrest
  0-rows response the caller has to special-case separately from an
  actual error.

The security boundary is the function's fixed return shape, not a
row-level policy — there is nothing this function can be asked to reveal
beyond what it explicitly selects and returns, regardless of what a
caller passes as the token.

## Consequences

- Verified directly: `set role anon; select * from
  get_circle_invitation_by_token(...)` succeeds, while `set role anon;
  select * from circle_invitations` still fails with a permission error —
  the table itself remains exactly as locked down as before.
- Any future field this function should expose has to be added
  explicitly to its `returns table (...)` — there's no way for a schema
  change elsewhere in `circle_invitations` to silently widen what a
  pre-auth visitor can see, the way a `using (true)` policy could.
- This is the same trust model `accept_circle_invitation` already
  established: the token itself is the capability (unguessable, random
  `uuid`), and holding it is what authorizes the lookup — consistent with
  treating the invite link as a bearer credential, not an identity claim.
