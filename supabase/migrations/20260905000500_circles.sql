create table public.circles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.circles is
  'A shared, permissioned space for a couple/family/household — see docs/product.md terminology and docs/permissions.md Stage 6 row.';

create index circles_owner_user_id_idx on public.circles (owner_user_id);

create trigger set_updated_at
  before update on public.circles
  for each row execute function public.set_updated_at();

alter table public.circles enable row level security;

-- Visible to the owner unconditionally — sufficient on its own even before
-- their own circle_members "owner" row exists (see the two-step create
-- flow in apps/web/src/server/circles/actions.ts). Additive visibility for
-- organiser/viewer members is added once circle_members exists, in
-- 20260905000600_circle_members.sql's "circles_select_peer_member" policy
-- (circle_members can't be referenced here — it doesn't exist yet at this
-- point in migration order).
create policy "circles_select_owner"
  on public.circles for select
  using (owner_user_id = auth.uid());

create policy "circles_insert_own"
  on public.circles for insert
  with check (owner_user_id = auth.uid());

create policy "circles_update_owner"
  on public.circles for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "circles_delete_owner"
  on public.circles for delete
  using (owner_user_id = auth.uid());
