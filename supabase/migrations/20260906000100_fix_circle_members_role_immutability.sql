-- Real bug found by Stage 9's security audit, not by code review alone:
-- `circle_members_update_self` (20260905000600_circle_members.sql) scopes
-- *which row* a member may update (`user_id = auth.uid()`) but places no
-- restriction on *which columns* change. Its own comment says "Role
-- changes go through revoke-and-reinvite, not an edit" — but nothing
-- enforced that. Any authenticated circle member (viewer or organiser)
-- could call the Supabase client directly with
-- `update({ role: 'owner' }).eq('id', <their own membership row>)` and
-- self-promote to owner, satisfying both USING and WITH CHECK, then
-- rename/delete the circle, remove other members, and manage every
-- person_shares/gift_ideas row for it.
--
-- docs/permissions.md's claim that "a direct UPDATE circle_members SET
-- role = ... affects zero rows even for the circle owner" was verified
-- against the owner updating *someone else's* row (correctly blocked by
-- `user_id = auth.uid()`), never against a member updating their *own*
-- row's role — exactly the path this left open. Corrected below.
--
-- A trigger, not a tighter RLS clause: comparing NEW.role to OLD.role
-- inside WITH CHECK would need a self-referencing subquery against
-- circle_members, the exact pattern that already caused the recursion bug
-- fixed in 20260905000600's own history
-- (docs/decisions/0011-circle-membership-rls-recursion.md). A BEFORE
-- UPDATE trigger compares OLD/NEW directly with no subquery, and applies
-- regardless of which role executes the UPDATE — including service_role,
-- which never legitimately changes a member's role in place either.
create or replace function public.circle_members_prevent_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role <> old.role or new.circle_id <> old.circle_id or new.user_id <> old.user_id then
    raise exception 'circle_members.role/circle_id/user_id cannot be changed by update; use revoke-and-reinvite'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

comment on function public.circle_members_prevent_identity_change() is
  'Enforces the revoke-and-reinvite role-change policy at the trigger level, independent of RLS, since circle_members_update_self only scopes rows (own row) not columns.';

create trigger circle_members_prevent_identity_change_trigger
before update on public.circle_members
for each row execute function public.circle_members_prevent_identity_change();
