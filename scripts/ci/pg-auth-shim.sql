-- CI-only shim replicating the parts of a Supabase project that our
-- migrations/policies depend on: the auth schema/table/uid() function and
-- the anon/authenticated/service_role roles. Verified against a real
-- Supabase project during Stage 1 development (see
-- docs/stage-reports/stage-1.md) — this is a lighter-weight stand-in for
-- CI, not a replacement for that verification.

create extension if not exists "pgcrypto";

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid
  language sql stable
  as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

-- Added for Stage 6: circle_invitations' RLS policies match an invitee by
-- email (auth.email()), matching the real Supabase function of the same
-- name/behaviour.
create or replace function auth.email() returns text
  language sql stable
  as $$
    select nullif(current_setting('request.jwt.claim.email', true), '')::text
  $$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public, auth to anon, authenticated, service_role;
