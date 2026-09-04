-- Supabase's security advisor (function_search_path_mutable) flagged the
-- original definition in 20260904000000_extensions_and_helpers.sql for not
-- pinning search_path, which allows search_path hijacking in a schema an
-- attacker can write to. Verified fix against the live project: advisor is
-- clean afterward. Safe because the body only calls now(), which resolves
-- via pg_catalog regardless of search_path.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
