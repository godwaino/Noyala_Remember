-- Transactional outbox / durable worker table. Matches the OutboxJob
-- contract in packages/domain/src/outbox.ts.
create table public.outbox_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  deduplication_key text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'dead_letter')),
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  available_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.outbox_jobs is
  'Not user-owned; only the service role (background workers) reads/writes this table. No RLS policy is intentional — it denies all access to anon/authenticated roles by default.';

create index outbox_jobs_claim_idx
  on public.outbox_jobs (type, available_at)
  where status = 'pending';

create trigger set_updated_at
  before update on public.outbox_jobs
  for each row execute function public.set_updated_at();

alter table public.outbox_jobs enable row level security;
-- No policies created: RLS with zero policies denies all rows to every
-- role except the service role, which bypasses RLS entirely.
