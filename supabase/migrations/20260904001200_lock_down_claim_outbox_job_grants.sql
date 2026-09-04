-- Verified against the live project: Supabase's project-level default
-- privileges auto-grant EXECUTE on every new public-schema function to
-- anon and authenticated (see `select * from pg_default_acl`), so the
-- `revoke all ... from public` in 20260904001100_claim_outbox_job.sql did
-- not remove their access — PUBLIC is a distinct grantee from the named
-- roles that received their own default-ACL grant. Revoke explicitly.
revoke execute on function public.claim_outbox_job(text, timestamptz) from anon, authenticated;
