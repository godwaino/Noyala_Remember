create table public.message_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  important_date_id uuid,
  tone text not null
    check (tone in (
      'short_and_warm', 'thoughtful', 'funny', 'professional', 'faith_based', 'custom'
    )),
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  -- Immutable snapshot of exactly which facts informed generation, so the
  -- user (and an auditor) can see what the model actually saw.
  context_snapshot jsonb not null default '{}'::jsonb,
  content text,
  generation_status text not null default 'pending'
    check (generation_status in ('pending', 'succeeded', 'failed')),
  model_metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint message_drafts_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade,
  constraint message_drafts_important_date_fk
    foreign key (important_date_id, user_id)
      references public.important_dates (id, user_id) on delete set null
);

comment on table public.message_drafts is
  'Generated, editable message options. Never sent directly from here — see message_history and docs/product.md ("Sending / approval policy").';

create index message_drafts_user_id_idx on public.message_drafts (user_id);
create index message_drafts_person_id_idx on public.message_drafts (person_id);

create trigger set_updated_at
  before update on public.message_drafts
  for each row execute function public.set_updated_at();

alter table public.message_drafts enable row level security;

create policy "message_drafts_select_own"
  on public.message_drafts for select
  using (auth.uid() = user_id);

create policy "message_drafts_insert_own"
  on public.message_drafts for insert
  with check (auth.uid() = user_id);

create policy "message_drafts_update_own"
  on public.message_drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "message_drafts_delete_own"
  on public.message_drafts for delete
  using (auth.uid() = user_id);
