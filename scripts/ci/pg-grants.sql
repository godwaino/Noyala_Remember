-- Mirrors the table-level grants a real Supabase project applies by
-- default (RLS policies, not these grants, are what actually restrict row
-- access — see docs/architecture.md).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;
grant execute on function public.claim_outbox_job(text, timestamptz) to service_role;
revoke execute on function public.claim_outbox_job(text, timestamptz) from anon, authenticated, public;
