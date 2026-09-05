-- Stores each browser's Web Push subscription so the reminder outbox
-- processor (apps/web/src/server/notifications) has something to send to.
-- Not listed in the Master Build Prompt §5 entity list (written before web
-- push existed as a concrete feature) — added now because Stage 2's
-- reminder-delivery work needs it; see docs/integrations.md.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Globally unique per browser/device, independent of which Noyala user
  -- created it — a device switching accounts re-subscribes under the new
  -- user via upsert-on-conflict rather than creating a duplicate row.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

comment on table public.push_subscriptions is
  'One row per browser Web Push subscription. A 404/410 from the push service means the endpoint is gone and the row should be deleted, not retried.';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
