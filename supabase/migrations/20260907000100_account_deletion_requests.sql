-- Recoverable account deletion (web redesign, /account/delete).
--
-- Replaces the immediate `auth.admin.deleteUser` call that
-- src/server/account/actions.ts used to make. A deletion is now a *request*
-- that sits here for a recovery window; a background job on the existing
-- daily cron performs the irreversible erasure once the window has passed.
-- Until then the user can sign in and cancel, and the account keeps working
-- exactly as before — the design's "scheduled" state, not a tombstone.
--
-- One row per user (user_id is the primary key), so requesting deletion
-- twice updates the existing request rather than racing two erasures. A
-- cancelled request is kept, not deleted, so "you cancelled this on the
-- 3rd" is answerable and so repeat request/cancel cycles are visible if we
-- ever need to look.

-- There is deliberately no 'completed' status. Erasure deletes the
-- auth.users row, and this table cascades from it — so a finished deletion
-- removes this row rather than marking it. The cascade *is* the completion
-- record, and a 'completed' row could never actually be observed. If the
-- erasure fails partway the row simply stays 'pending' and the next cron
-- run retries it, which is what we want.
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled')),
  -- Free-text, optional, and never required to proceed: the design offers a
  -- reason box but deletion must never be gated on answering it.
  reason text check (reason is null or char_length(reason) <= 2000),
  requested_at timestamptz not null default now(),
  -- Denormalised rather than computed from requested_at at read time so the
  -- window a user was actually promised survives any later change to
  -- RECOVERY_WINDOW_DAYS. What we told them is what we honour.
  erase_after timestamptz not null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint account_deletion_requests_erase_after_future
    check (erase_after > requested_at),
  constraint account_deletion_requests_cancelled_at_matches_status
    check ((status = 'cancelled') = (cancelled_at is not null))
);

comment on table public.account_deletion_requests is
  'One row per user. A pending row past its erase_after is erased by the '
  'daily cron (see src/server/outbox/process-account-deletions.ts). '
  'Cancelled rows are retained deliberately as an audit trail.';

comment on column public.account_deletion_requests.erase_after is
  'Denormalised deliberately: the recovery window promised at request time '
  'is honoured even if the default window changes later.';

create trigger set_updated_at
  before update on public.account_deletion_requests
  for each row execute function public.set_updated_at();

-- Only pending rows are ever claimed by the cron, and only a handful exist
-- at a time, so a partial index keeps the scan proportional to that.
create index account_deletion_requests_due_idx
  on public.account_deletion_requests (erase_after)
  where status = 'pending';

alter table public.account_deletion_requests enable row level security;

-- A user can see, request and cancel their own deletion. There is
-- deliberately no delete policy: cancelling sets status, it does not remove
-- the row, and the erasure itself runs as service_role.
create policy "account_deletion_requests_select_own"
  on public.account_deletion_requests for select
  using ((select auth.uid()) = user_id);

create policy "account_deletion_requests_insert_own"
  on public.account_deletion_requests for insert
  with check ((select auth.uid()) = user_id);

create policy "account_deletion_requests_update_own"
  on public.account_deletion_requests for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
