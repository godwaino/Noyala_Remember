create table public.extracted_memory_candidates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  voice_capture_id uuid not null,
  -- Plain FK, nullable — same reasoning as voice_captures.person_id.
  person_id uuid references public.people (id) on delete set null,
  proposed_content text not null check (char_length(trim(proposed_content)) > 0),
  proposed_category text not null default 'general'
    check (proposed_category in (
      'family', 'work', 'interest', 'milestone', 'gift', 'preference', 'general'
    )),
  -- Explicit review gate: no transcript-derived fact becomes a memory
  -- without this moving to 'accepted' first (Master Build Prompt §7/§13
  -- exit gate: "no transcript-derived fact is saved without review").
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  -- Source linkage once accepted: which real memories row this candidate
  -- became, so the UI can show "from a voice note" without duplicating
  -- content. Plain FK (not composite): the memory is created by a
  -- separate insert once the user approves, not structurally tied to this
  -- row's own user_id the way a required same-owner link would be.
  resulting_memory_id uuid references public.memories (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint extracted_memory_candidates_voice_capture_fk
    foreign key (voice_capture_id, user_id) references public.voice_captures (id, user_id) on delete cascade
);

comment on table public.extracted_memory_candidates is
  'Proposed facts extracted from a voice_captures transcript, pending explicit per-fact approval before becoming a real memories row. See docs/product.md and Master Build Prompt §7/§13.';

create index extracted_memory_candidates_user_id_idx on public.extracted_memory_candidates (user_id);
create index extracted_memory_candidates_voice_capture_id_idx on public.extracted_memory_candidates (voice_capture_id);
create index extracted_memory_candidates_person_id_idx on public.extracted_memory_candidates (person_id);

alter table public.extracted_memory_candidates enable row level security;

create policy "extracted_memory_candidates_select_own"
  on public.extracted_memory_candidates for select
  using (auth.uid() = user_id);

create policy "extracted_memory_candidates_insert_own"
  on public.extracted_memory_candidates for insert
  with check (auth.uid() = user_id);

-- Reviewing (accept/reject) is an update, not a delete — kept as an audit
-- trail of what was proposed and what the user decided, matching this
-- schema's consents/circle_invitations soft-state precedent. No delete
-- policy exists; rows only go away via voice_capture_id's cascade.
create policy "extracted_memory_candidates_update_own"
  on public.extracted_memory_candidates for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
