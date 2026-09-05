-- Bug found by live verification: storage_path was `not null` with a
-- non-empty CHECK constraint, but "deletion of the audio independently of
-- the approved text" (Master Build Prompt §13) means the row must be able
-- to exist with no audio reference at all once deleted, while its
-- transcript and any resulting memories stay intact. Postgres CHECK
-- constraints pass automatically on NULL, so making the column nullable
-- (rather than trying to special-case an empty string) is the fix that
-- actually satisfies the original constraint's intent — a *non-null*
-- storage_path must still be non-empty.
alter table public.voice_captures
  alter column storage_path drop not null;
