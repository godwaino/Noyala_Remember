create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  type text not null check (type in ('birthday', 'anniversary', 'custom')),
  label text not null check (char_length(trim(label)) > 0),
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31),
  -- Deliberately nullable: never fabricate a birth year. See docs/product.md.
  year integer check (year is null or year between 1900 and 2100),
  recurs_annually boolean not null default true,
  -- Days-before-the-date to remind at. Stage 1 default supports 14, 7, 1, 0.
  reminder_offsets integer[] not null default '{14,7,1,0}',
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint important_dates_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade
);

comment on table public.important_dates is
  'Birthdays, anniversaries and custom recurring milestones for a person.';

-- See people_id_user_id_key for why: lets message_drafts/message_history/
-- notification_deliveries reference (important_date_id, user_id) safely.
alter table public.important_dates
  add constraint important_dates_id_user_id_key unique (id, user_id);

create index important_dates_user_id_idx on public.important_dates (user_id);
create index important_dates_person_id_idx on public.important_dates (person_id);
create index important_dates_month_day_idx on public.important_dates (month, day);

create trigger set_updated_at
  before update on public.important_dates
  for each row execute function public.set_updated_at();

alter table public.important_dates enable row level security;

create policy "important_dates_select_own"
  on public.important_dates for select
  using (auth.uid() = user_id);

create policy "important_dates_insert_own"
  on public.important_dates for insert
  with check (auth.uid() = user_id);

create policy "important_dates_update_own"
  on public.important_dates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "important_dates_delete_own"
  on public.important_dates for delete
  using (auth.uid() = user_id);
