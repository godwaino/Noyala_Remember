create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text,
  nickname text,
  relationship_type text not null
    check (relationship_type in (
      'partner', 'family', 'friend', 'colleague', 'acquaintance', 'other'
    )),
  phone text,
  email text,
  pronouns text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.people is
  'A person the user tracks. "Person", never "contact" or "lead" — see docs/product.md.';

-- Lets child tables (important_dates, memories, ...) declare a composite
-- foreign key on (person_id, user_id), so a row can never reference a
-- person owned by a different user even if application code has a bug.
-- Row Level Security is still the primary enforcement mechanism; this is
-- defense in depth at the schema level.
alter table public.people add constraint people_id_user_id_key unique (id, user_id);

create index people_user_id_idx on public.people (user_id);
create index people_user_id_archived_at_idx on public.people (user_id, archived_at);

create trigger set_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

alter table public.people enable row level security;

create policy "people_select_own"
  on public.people for select
  using (auth.uid() = user_id);

create policy "people_insert_own"
  on public.people for insert
  with check (auth.uid() = user_id);

create policy "people_update_own"
  on public.people for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "people_delete_own"
  on public.people for delete
  using (auth.uid() = user_id);
