create table public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  -- Optional: a follow-up can arise from a specific logged interaction, or
  -- be created standalone (Master Build Prompt §4's example: "ask how the
  -- interview went").
  interaction_id uuid,
  description text not null check (char_length(trim(description)) > 0),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_ups_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade,
  constraint follow_ups_interaction_fk
    foreign key (interaction_id, user_id) references public.interactions (id, user_id) on delete set null
);

comment on table public.follow_ups is
  'Private follow-up commitments ("ask how the interview went") — deliberately no scores, rankings or streaks. See docs/product.md.';

create index follow_ups_user_id_idx on public.follow_ups (user_id);
create index follow_ups_person_id_idx on public.follow_ups (person_id);
create index follow_ups_status_due_at_idx on public.follow_ups (status, due_at);

create trigger set_updated_at
  before update on public.follow_ups
  for each row execute function public.set_updated_at();

alter table public.follow_ups enable row level security;

create policy "follow_ups_select_own"
  on public.follow_ups for select
  using (auth.uid() = user_id);

create policy "follow_ups_insert_own"
  on public.follow_ups for insert
  with check (auth.uid() = user_id);

create policy "follow_ups_update_own"
  on public.follow_ups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "follow_ups_delete_own"
  on public.follow_ups for delete
  using (auth.uid() = user_id);
