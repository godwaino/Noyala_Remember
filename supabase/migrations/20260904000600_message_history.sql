create table public.message_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  important_date_id uuid,
  final_content text not null,
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  -- 'opened_in_app' is not proof of delivery and must never be presented as
  -- such in the UI. See docs/product.md ("Sending / approval policy").
  action text not null check (action in ('copied', 'opened_in_app', 'marked_sent')),
  acted_at timestamptz not null default now(),
  constraint message_history_person_fk
    foreign key (person_id, user_id) references public.people (id, user_id) on delete cascade,
  constraint message_history_important_date_fk
    foreign key (important_date_id, user_id)
      references public.important_dates (id, user_id) on delete set null
);

comment on table public.message_history is
  'Record of what the user actually did with a draft. Append-only in practice.';

create index message_history_user_id_idx on public.message_history (user_id);
create index message_history_person_id_idx on public.message_history (person_id);

alter table public.message_history enable row level security;

create policy "message_history_select_own"
  on public.message_history for select
  using (auth.uid() = user_id);

create policy "message_history_insert_own"
  on public.message_history for insert
  with check (auth.uid() = user_id);

-- No update/delete policy: history is an audit trail of user actions.
