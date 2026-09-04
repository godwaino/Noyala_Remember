create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  important_date_id uuid not null,
  scheduled_for timestamptz not null,
  channel text not null check (channel in ('email', 'push')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'sent', 'failed', 'cancelled')),
  attempt_count integer not null default 0,
  -- Guarantees the reminder worker can run twice without double-delivering.
  deduplication_key text not null unique,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_important_date_fk
    foreign key (important_date_id, user_id)
      references public.important_dates (id, user_id) on delete cascade
);

comment on table public.notification_deliveries is
  'Reminder-notification records only — never the generated personal message itself.';

create index notification_deliveries_user_id_idx on public.notification_deliveries (user_id);
create index notification_deliveries_scheduled_for_status_idx
  on public.notification_deliveries (scheduled_for, status);

create trigger set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();

alter table public.notification_deliveries enable row level security;

create policy "notification_deliveries_select_own"
  on public.notification_deliveries for select
  using (auth.uid() = user_id);

-- No insert/update/delete policy for regular users: only the reminder
-- worker (service role, bypasses RLS) writes these rows.
