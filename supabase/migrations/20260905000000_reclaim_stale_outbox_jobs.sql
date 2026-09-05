-- Resolves a real gap flagged in review.md: "Avoid duplicate delivery" was
-- stated without defining what happens when a worker crashes after
-- claiming a job but before recording success or failure. Previously such
-- a job stayed status='processing' forever — nothing ever reclaimed it.
--
-- Fix: claim_outbox_job now also reclaims jobs stuck in 'processing' for
-- longer than `stale_after` (default 10 minutes — comfortably longer than
-- any job this app currently runs). A stale job that has already
-- exhausted its attempts is dead-lettered instead of being reclaimed
-- forever. `updated_at` is a reliable "claimed at" signal because nothing
-- else touches a job between claim and markSucceeded/markFailed.
drop function if exists public.claim_outbox_job(text, timestamptz);

create or replace function public.claim_outbox_job(
  job_type text,
  claim_now timestamptz default now(),
  stale_after interval default interval '10 minutes'
)
returns setof public.outbox_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
  claimed_attempt_count integer;
  claimed_max_attempts integer;
begin
  select id, attempt_count, max_attempts
    into claimed_id, claimed_attempt_count, claimed_max_attempts
  from public.outbox_jobs
  where type = job_type
    and (
      (status in ('pending', 'failed') and available_at <= claim_now)
      or (status = 'processing' and updated_at < claim_now - stale_after)
    )
  order by available_at
  for update skip locked
  limit 1;

  if claimed_id is null then
    return;
  end if;

  if claimed_attempt_count >= claimed_max_attempts then
    update public.outbox_jobs
    set status = 'dead_letter',
        last_error = coalesce(last_error, 'Exceeded max attempts after a stale/crashed worker.')
    where id = claimed_id;
    return;
  end if;

  return query
  update public.outbox_jobs
  set status = 'processing', attempt_count = attempt_count + 1
  where id = claimed_id
  returning *;
end;
$$;

comment on function public.claim_outbox_job(text, timestamptz, interval) is
  'Service-role only. Atomically claims the oldest eligible pending/failed job, or a stale "processing" job (worker crash recovery), of a given type; dead-letters a stale job whose attempts are already exhausted.';

revoke all on function public.claim_outbox_job(text, timestamptz, interval) from public;
revoke execute on function public.claim_outbox_job(text, timestamptz, interval) from anon, authenticated;
grant execute on function public.claim_outbox_job(text, timestamptz, interval) to service_role;
