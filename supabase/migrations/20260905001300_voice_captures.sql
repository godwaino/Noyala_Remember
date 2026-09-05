create table public.voice_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable, plain FK (not the usual composite-to-owner pattern used by
  -- important_dates/memories/interactions): a note can be recorded before
  -- deciding who it's about, and the link is corrected during candidate
  -- review rather than fixed at capture time. Same reasoning as
  -- gift_ideas.person_id in Stage 6 — see that migration's comment.
  person_id uuid references public.people (id) on delete set null,
  storage_path text not null check (char_length(trim(storage_path)) > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  transcription_status text not null default 'pending'
    check (transcription_status in ('pending', 'processing', 'succeeded', 'failed')),
  transcript text,
  -- Independent deletion of the audio vs. the approved text (Master Build
  -- Prompt §13: "Provide deletion of the audio independently of the
  -- approved text"). Null while the audio file still exists in storage;
  -- app code clears storage_path and sets this when the user deletes just
  -- the recording, keeping the transcript/any accepted memories intact.
  audio_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.voice_captures is
  'Private voice-note recordings: storage reference, duration, transcription status, and independent audio-deletion state. See docs/product.md and Master Build Prompt §13.';

create index voice_captures_user_id_idx on public.voice_captures (user_id);
create index voice_captures_person_id_idx on public.voice_captures (person_id);

-- Lets extracted_memory_candidates declare a composite FK on
-- (id, user_id), matching the pattern every other child table in this
-- schema uses for cross-record isolation.
alter table public.voice_captures
  add constraint voice_captures_id_user_id_key unique (id, user_id);

create trigger set_updated_at
  before update on public.voice_captures
  for each row execute function public.set_updated_at();

alter table public.voice_captures enable row level security;

create policy "voice_captures_select_own"
  on public.voice_captures for select
  using (auth.uid() = user_id);

create policy "voice_captures_insert_own"
  on public.voice_captures for insert
  with check (auth.uid() = user_id);

create policy "voice_captures_update_own"
  on public.voice_captures for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "voice_captures_delete_own"
  on public.voice_captures for delete
  using (auth.uid() = user_id);
