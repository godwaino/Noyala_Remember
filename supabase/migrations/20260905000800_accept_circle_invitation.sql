-- Atomically resolves a pending invitation and creates the caller's
-- circle_members row. Wrapped in a function (rather than two client
-- inserts) so a circle_members row can never exist without a matching
-- accepted invitation — mirrors the claim_outbox_job atomic-transition
-- pattern. Runs as SECURITY DEFINER so it can perform the
-- circle_invitations update and circle_members insert even though neither
-- table's RLS grants the invitee a direct path to either write.
create or replace function public.accept_circle_invitation(invitation_token uuid)
returns public.circle_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.circle_invitations;
  member public.circle_members;
  caller_email text;
begin
  caller_email := auth.email();
  if caller_email is null or auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.circle_invitations
  where token = invitation_token
    and status = 'pending'
  for update;

  if inv is null then
    raise exception 'invitation not found or no longer pending';
  end if;

  if lower(inv.invited_email) <> lower(caller_email) then
    raise exception 'invitation is not addressed to the current user';
  end if;

  update public.circle_invitations
  set status = 'accepted', responded_at = now()
  where id = inv.id;

  insert into public.circle_members (circle_id, user_id, role)
  values (inv.circle_id, auth.uid(), inv.role)
  on conflict (circle_id, user_id) do nothing
  returning * into member;

  if member is null then
    select * into member
    from public.circle_members
    where circle_id = inv.circle_id and user_id = auth.uid();
  end if;

  return member;
end;
$$;

comment on function public.accept_circle_invitation(uuid) is
  'Authenticated callers only. Marks a pending invitation accepted and inserts the caller''s circle_members row in one atomic step.';

revoke all on function public.accept_circle_invitation(uuid) from public;
revoke execute on function public.accept_circle_invitation(uuid) from anon, authenticated;
grant execute on function public.accept_circle_invitation(uuid) to authenticated;
