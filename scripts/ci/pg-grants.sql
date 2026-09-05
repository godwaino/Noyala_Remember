-- Mirrors the table-level grants a real Supabase project applies by
-- default (RLS policies, not these grants, are what actually restrict row
-- access — see docs/architecture.md).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant all on all tables in schema public to service_role;
-- claim_outbox_job's own grants/revokes live in its migration file
-- (20260905000000_reclaim_stale_outbox_jobs.sql) since, unlike the
-- table-level grants above, Supabase's platform-level default ACLs don't
-- cover functions the way this script otherwise mirrors — see that
-- migration's comment for why an explicit revoke is needed at all.
