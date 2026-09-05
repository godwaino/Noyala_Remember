# 11. Circle-membership visibility needs a SECURITY DEFINER helper, not a self-referencing RLS policy

Date: 2026-09-05

## Status

Accepted

## Context

Stage 6's `circle_members` table needs a "peer visibility" policy: a
member of a circle should be able to see every other row for that circle,
not just their own. The obvious first attempt was a plain self-referencing
subquery:

```sql
create policy "circle_members_select_circle_peers"
  on public.circle_members for select
  using (
    exists (
      select 1 from public.circle_members cm2
      where cm2.circle_id = circle_members.circle_id and cm2.user_id = auth.uid()
    )
  );
```

Reasoning at design time was that this terminates because the inner
subquery's own row (`cm2.user_id = auth.uid()`) is already visible via a
separate `circle_members_select_self` policy (`user_id = auth.uid()`), so
no further recursion should be needed. Live testing proved this wrong: the
very first insert into `circles` after creating this policy (which
evaluates the `circles_select_peer_member` policy on `RETURNING`, which in
turn selects from `circle_members`) failed with:

```
ERROR: 42P17: infinite recursion detected in policy for relation "circle_members"
```

Postgres does not prove that the self-row is reachable via the sibling
policy and stop there — every enabled policy on a table is OR'd together
and re-evaluated in full for *every* nested scan of that table, including
one triggered from inside another policy on the same table. There is no
short-circuit tied to "this row already matches a cheaper policy."
Self-referencing RLS subqueries on the same table are consequently a real,
easy-to-hit footgun, not a hypothetical edge case — this was caught only
by attempting a live insert, not by writing or reviewing the SQL.

## Decision

Break the cycle with a `SECURITY DEFINER` helper function, the same
pattern this codebase already uses for `claim_outbox_job` and
`accept_circle_invitation`:

```sql
create function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id and user_id = p_user_id
  )
$$;
```

A `SECURITY DEFINER` function runs as its owner, which bypasses the
table's own RLS entirely (no `FORCE ROW LEVEL SECURITY` is set on
`circle_members`), so calling it from a policy never triggers another
policy evaluation on the same table. Both `circle_members_select_circle_peers`
and `circles_select_peer_member` now call `is_circle_member(...)` instead
of embedding the subquery directly. See
`supabase/migrations/20260905001200_fix_circle_members_recursive_rls.sql`.

## Consequences

- Any future "is X a member of Y" check anywhere in this schema should
  reuse `is_circle_member`, not re-embed the subquery — the function is
  exactly the safe primitive this bug proves is needed.
- The function is deliberately locked down like every other
  `SECURITY DEFINER` function in this codebase: revoked from `anon`,
  granted only to `authenticated`. `get_advisors` flags it as
  "callable by signed-in users" — expected and reviewed, same category as
  `accept_circle_invitation`, not a new finding to chase.
- Verified live end-to-end after the fix: circle creation, invitation
  acceptance, peer visibility, and cross-circle isolation all work with no
  recursion error — see `docs/stage-reports/stage-6.md`.
