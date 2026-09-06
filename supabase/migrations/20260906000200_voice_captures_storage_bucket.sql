-- Private storage bucket for voice_captures' audio files, needed now that
-- apps/mobile actually records and uploads them (Stage 7's remaining
-- work per docs/roadmap.md: "wire ... against the already-built schema").
-- Objects are stored at `{user_id}/{voice_capture_id}.<ext>`, so RLS can
-- scope access by folder name the same way every table policy in this
-- schema scopes by `user_id` — a user can only read/write/delete objects
-- under their own folder, never another user's.
insert into storage.buckets (id, name, public)
values ('voice-captures', 'voice-captures', false)
on conflict (id) do nothing;

create policy "voice_captures_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'voice-captures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice_captures_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'voice-captures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "voice_captures_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'voice-captures'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
