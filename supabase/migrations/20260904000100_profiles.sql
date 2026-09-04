create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  timezone text not null default 'UTC',
  locale text not null default 'en',
  default_tone text not null default 'thoughtful'
    check (default_tone in (
      'short_and_warm', 'thoughtful', 'funny', 'professional', 'faith_based', 'custom'
    )),
  default_reminder_offsets integer[] not null default '{14,7,1,0}',
  preferred_reminder_channel text not null default 'email'
    check (preferred_reminder_channel in ('email', 'push')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth.users row. Created/completed during onboarding.';

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: account deletion is a Stage 2 admin-reviewed flow that
-- also has to cascade memories/drafts/etc., not a bare row delete.
