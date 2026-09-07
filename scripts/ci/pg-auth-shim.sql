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

-- Added for Stage 7: 20260906000200_voice_captures_storage_bucket.sql
-- creates a bucket and RLS policies in Supabase's `storage` schema, which
-- the plain `postgres` service container in .github/workflows/ci.yml does
-- not provide. Without this the migrations job aborts on that file, so
-- every migration ordered after it — and any new one added to this
-- directory — is never applied or checked at all.
--
-- Mirrors only the shape that migration depends on (buckets, objects,
-- foldername), not the rest of Supabase Storage. Same caveat as the auth
-- shim above: a lighter-weight CI stand-in, not a replacement for
-- verification against a real project.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid
);

alter table storage.objects enable row level security;

-- Supabase's helper: splits an object path into its folder segments so a
-- policy can scope by `(storage.foldername(name))[1]`.
create or replace function storage.foldername(name text) returns text[]
  language plpgsql immutable
  as $$
  declare
    parts text[];
  begin
    parts := string_to_array(name, '/');
    return parts[1:array_length(parts, 1) - 1];
  end
  $$;

grant usage on schema storage to anon, authenticated, service_role;
