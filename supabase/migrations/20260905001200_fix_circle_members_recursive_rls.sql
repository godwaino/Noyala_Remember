-- Bug found by live verification: circle_members_select_circle_peers'
-- self-referencing subquery on circle_members caused
-- "infinite recursion detected in policy for relation circle_members"
-- (Postgres 42P17) on any insert/select touching the table. Self-join RLS
-- policies do not reliably short-circuit via a sibling policy — Postgres
-- re-evaluates the full OR'd policy set for every nested scan, including
-- of the same table — so the membership check has to happen in a
-- SECURITY DEFINER function instead, exactly like claim_outbox_job and
-- accept_circle_invitation already do to bypass RLS deliberately.
create or replace function public.is_circle_member(p_circle_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.circle_members
    where circle_id = p_circle_id and user_id = p_user_id
  )
$$;

comment on function public.is_circle_member(uuid, uuid) is
  'RLS helper: is p_user_id an accepted member of p_circle_id? SECURITY DEFINER so it bypasses circle_members'' own RLS instead of recursing into it.';

revoke all on function public.is_circle_member(uuid, uuid) from public;
revoke execute on function public.is_circle_member(uuid, uuid) from anon, authenticated;
grant execute on function public.is_circle_member(uuid, uuid) to authenticated;

drop policy "circle_members_select_circle_peers" on public.circle_members;
create policy "circle_members_select_circle_peers"
  on public.circle_members for select
  using (public.is_circle_member(circle_id, auth.uid()));

drop policy "circles_select_peer_member" on public.circles;
create policy "circles_select_peer_member"
  on public.circles for select
  using (public.is_circle_member(id, auth.uid()));
