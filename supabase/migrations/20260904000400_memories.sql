create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  content text not null check (char_length(trim(content)) > 0),
  category text not null default 'general'
    check (category in (
      'family', 'work', 'interest', 'milestone', 'gift', 'preference', 'general'
    )),
  occurred_on date,
  sensitivity text not null default 'standard'
    check (sensitivity in ('standard', 'sensitive')),
  source text not null default 'manual' check (source in ('manual')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

comment on table public.memories is
  'User-authored facts about a person. sensitivity=sensitive is excluded from AI context by default — see docs/product.md.';

create index memories_user_id_idx on public.memories (user_id);
create index memories_person_id_idx on public.memories (person_id);

create trigger set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

alter table public.memories enable row level security;

create policy "memories_select_own"
  on public.memories for select
  using (auth.uid() = user_id);

create policy "memories_insert_own"
  on public.memories for insert
  with check (auth.uid() = user_id);

create policy "memories_update_own"
  on public.memories for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "memories_delete_own"
  on public.memories for delete
  using (auth.uid() = user_id);
