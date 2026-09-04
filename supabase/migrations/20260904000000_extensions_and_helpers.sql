-- Stage 1 foundation: extensions and shared helpers used by every
-- subsequent migration in this project.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- Keeps `updated_at` correct without relying on every write path
-- remembering to set it. Attached per-table by later migrations.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Row-level trigger: stamps updated_at = now() on every UPDATE.';
