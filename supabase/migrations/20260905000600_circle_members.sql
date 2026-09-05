create table public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'organiser', 'viewer')),
  -- Self-identification: which person-record (in *any* member's own people
  -- list, not necessarily this row's own user_id) represents this member
  -- within the circle. Plain FK rather than the usual composite-to-owner
  -- pattern, because the person is very often owned by a different circle
  -- member than the one linking themselves to it. Used by gift_ideas RLS
  -- (see the Stage 6 gifting migration) to hide gifts targeting yourself.
  -- Application code is responsible for only ever setting this to a person
  -- actually shared into this same circle; not enforced at the schema
  -- level (a plain FK can't reference "shared into this circle").
  linked_person_id uuid references public.people (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (circle_id, user_id)
);

comment on table public.circle_members is
  'Accepted circle membership. A row here only ever comes from circle creation (owner) or public.accept_circle_invitation (organiser/viewer) — never a direct client insert for the latter two roles.';

create index circle_members_circle_id_idx on public.circle_members (circle_id);
create index circle_members_user_id_idx on public.circle_members (user_id);
create index circle_members_linked_person_id_idx on public.circle_members (linked_person_id);

alter table public.circle_members enable row level security;

-- Additive to circles_select_owner (20260905000500_circles.sql): lets an
-- organiser/viewer member see the circle itself, not just their own
-- membership row. Deferred to here because circle_members didn't exist yet
-- when circles.sql ran.
create policy "circles_select_peer_member"
  on public.circles for select
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circles.id and cm.user_id = auth.uid()
    )
  );

-- A member can always see their own membership row...
create policy "circle_members_select_self"
  on public.circle_members for select
  using (user_id = auth.uid());

-- ...and, additively, every member's row for a circle they themselves
-- belong to. The self-referencing subquery terminates via the policy
-- above (a user's own row is always visible), so this does not recurse.
create policy "circle_members_select_circle_peers"
  on public.circle_members for select
  using (
    exists (
      select 1 from public.circle_members cm2
      where cm2.circle_id = circle_members.circle_id and cm2.user_id = auth.uid()
    )
  );

-- Only the circle-creation flow may insert an "owner" row for oneself.
-- Organiser/viewer rows are created exclusively by
-- public.accept_circle_invitation, which runs as SECURITY DEFINER and so
-- is not bound by this policy.
create policy "circle_members_insert_owner_on_create"
  on public.circle_members for insert
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1 from public.circles c
      where c.id = circle_id and c.owner_user_id = auth.uid()
    )
  );

-- A member may update only their own row (in practice: self-identifying
-- linked_person_id). Role changes go through revoke-and-reinvite, not an
-- edit, for this stage.
create policy "circle_members_update_self"
  on public.circle_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- A member can leave (delete their own row); the circle owner can remove
-- anyone.
create policy "circle_members_delete_self_or_owner"
  on public.circle_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.circles c
      where c.id = circle_members.circle_id and c.owner_user_id = auth.uid()
    )
  );
