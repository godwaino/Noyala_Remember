-- Atomic, concurrency-safe job claim for the outbox worker. PostgREST (the
-- API supabase-js talks to) can't express `SELECT ... FOR UPDATE SKIP
-- LOCKED` directly, so it's wrapped in a function and called via .rpc().
-- This is what makes OutboxStore.claimNext safe when multiple worker
-- instances poll at once — see packages/domain/src/outbox.ts.
create or replace function public.claim_outbox_job(job_type text, claim_now timestamptz default now())
returns setof public.outbox_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  select id into claimed_id
  from public.outbox_jobs
  where type = job_type
    and status in ('pending', 'failed')
    and available_at <= claim_now
  order by available_at
  for update skip locked
  limit 1;

  if claimed_id is null then
    return;
  end if;

  return query
  update public.outbox_jobs
  set status = 'processing', attempt_count = attempt_count + 1
  where id = claimed_id
  returning *;
end;
$$;

comment on function public.claim_outbox_job(text, timestamptz) is
  'Service-role only. Atomically claims and marks "processing" the oldest eligible pending/failed job of a given type.';

revoke all on function public.claim_outbox_job(text, timestamptz) from public;
grant execute on function public.claim_outbox_job(text, timestamptz) to service_role;
