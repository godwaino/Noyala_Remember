create table public.interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  type text not null check (type in ('call', 'visit', 'message', 'meeting', 'other')),
  occurred_at timestamptz not null,
  summary text,
  -- Only 'manual' exists today (no connected calendar/call-log source yet);
  -- kept as its own column now so a future connected source (Stage 4
  -- continuation) doesn't need a schema change to be distinguishable from
  -- what the user typed in themselves.
  source text not null default 'manual' check (source in ('manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interactions_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

comment on table public.interactions is
  'User-logged calls/visits/messages/meetings with a person — the basis for reconnect-cadence and conversation-prep features. See docs/product.md.';

-- Enables follow_ups' composite FK to (id, user_id), matching the same
-- pattern people/important_dates already use for cross-record isolation.
alter table public.interactions add constraint interactions_id_user_id_key unique (id, user_id);

create index interactions_user_id_idx on public.interactions (user_id);
create index interactions_person_id_idx on public.interactions (person_id);
create index interactions_person_occurred_at_idx on public.interactions (person_id, occurred_at desc);

create trigger set_updated_at
  before update on public.interactions
  for each row execute function public.set_updated_at();

alter table public.interactions enable row level security;

create policy "interactions_select_own"
  on public.interactions for select
  using (auth.uid() = user_id);

create policy "interactions_insert_own"
  on public.interactions for insert
  with check (auth.uid() = user_id);

create policy "interactions_update_own"
  on public.interactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "interactions_delete_own"
  on public.interactions for delete
  using (auth.uid() = user_id);
