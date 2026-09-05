create table public.circle_invitations (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  invited_email text not null check (char_length(trim(invited_email)) > 0),
  invited_by_user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('organiser', 'viewer')),
  token uuid not null default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

comment on table public.circle_invitations is
  'Pending/resolved invitations to join a circle. Accepting one is a separate atomic step (public.accept_circle_invitation) that also creates the circle_members row, so a member can never exist without a matching accepted invitation.';

create unique index circle_invitations_token_key on public.circle_invitations (token);
create index circle_invitations_circle_id_idx on public.circle_invitations (circle_id);
create index circle_invitations_invited_email_idx on public.circle_invitations (lower(invited_email));

-- One live (pending) invitation per circle/email at a time — mirrors
-- consents' active-row partial unique index. Past declined/revoked
-- invitations are kept for audit rather than deleted, so re-inviting the
-- same email later is still possible once the old row is resolved.
create unique index circle_invitations_circle_email_pending_idx
  on public.circle_invitations (circle_id, lower(invited_email))
  where status = 'pending';

alter table public.circle_invitations enable row level security;

create policy "circle_invitations_select_manager"
  on public.circle_invitations for select
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_invitations.circle_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'organiser')
    )
  );

create policy "circle_invitations_select_invitee"
  on public.circle_invitations for select
  using (lower(invited_email) = lower(auth.email()));

create policy "circle_invitations_insert_manager"
  on public.circle_invitations for insert
  with check (
    invited_by_user_id = auth.uid()
    and exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'organiser')
    )
  );

-- Direct updates only ever move a pending invitation to 'declined' (by the
-- invitee) or 'revoked' (by an owner/organiser). Moving to 'accepted' is
-- deliberately not reachable through RLS at all — only
-- public.accept_circle_invitation can do that, because it must also create
-- the matching circle_members row in the same atomic step.
create policy "circle_invitations_update_invitee_decline"
  on public.circle_invitations for update
  using (lower(invited_email) = lower(auth.email()) and status = 'pending')
  with check (status = 'declined' and lower(invited_email) = lower(auth.email()));

create policy "circle_invitations_update_manager_revoke"
  on public.circle_invitations for update
  using (
    status = 'pending'
    and exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_invitations.circle_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'organiser')
    )
  )
  with check (status = 'revoked');
