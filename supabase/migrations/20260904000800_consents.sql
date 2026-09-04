create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent_type text not null
    check (consent_type in ('memory_ai_usage', 'contact_import', 'marketing_updates')),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

comment on table public.consents is
  'Revocable consent records. Withdrawing sets withdrawn_at rather than deleting the row, preserving the audit trail.';

create index consents_user_id_idx on public.consents (user_id);
create unique index consents_user_id_type_active_idx
  on public.consents (user_id, consent_type)
  where withdrawn_at is null;

alter table public.consents enable row level security;

create policy "consents_select_own"
  on public.consents for select
  using (auth.uid() = user_id);

create policy "consents_insert_own"
  on public.consents for insert
  with check (auth.uid() = user_id);

create policy "consents_update_own"
  on public.consents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
