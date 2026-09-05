create table public.person_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null,
  circle_id uuid not null references public.circles (id) on delete cascade,
  -- Sharing a person is circle-scoped, not per-member: every accepted
  -- member of the circle gains the same visibility. Per-member grants
  -- would need a different table shape; not required by the product doc's
  -- "shared circles" model and not built speculatively here.
  --
  -- Both default false/true intentionally: memory content is the one
  -- category the product rules say must never be shared "by default"
  -- (docs/product.md), so its flag defaults off; important dates and
  -- gift planning are the whole point of sharing a person into a circle,
  -- so gift planning defaults on. Dates have no flag at all — sharing a
  -- person always shares their dates (see the additive policy below);
  -- they are not the "private notes" the exclusion list is about.
  share_memories boolean not null default false,
  share_gift_planning boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint person_shares_person_fk
    foreign key (person_id, owner_user_id) references public.people (id, user_id) on delete cascade
);

comment on table public.person_shares is
  'Grants a circle visibility into one of the owner''s people. Revoking sets revoked_at rather than deleting, preserving the audit trail (mirrors consents). See docs/permissions.md Stage 6 row.';

create index person_shares_owner_user_id_idx on public.person_shares (owner_user_id);
create index person_shares_person_id_idx on public.person_shares (person_id);
create index person_shares_circle_id_idx on public.person_shares (circle_id);

-- One live share per person/circle at a time; past revoked shares are kept
-- for audit rather than deleted.
create unique index person_shares_person_circle_active_idx
  on public.person_shares (person_id, circle_id)
  where revoked_at is null;

alter table public.person_shares enable row level security;

create policy "person_shares_select_owner"
  on public.person_shares for select
  using (owner_user_id = auth.uid());

-- Circle members need to see which of the circle's shares exist (and their
-- flags) to render "shared with you" / gift-planning UI, even though they
-- don't own the underlying person row.
create policy "person_shares_select_circle_member"
  on public.person_shares for select
  using (
    exists (
      select 1 from public.circle_members cm
      where cm.circle_id = person_shares.circle_id and cm.user_id = auth.uid()
    )
  );

-- Only an owner or organiser may share a person into the circle — a
-- viewer can view and plan gifts but not decide what gets shared. The
-- composite person_shares_person_fk above already guarantees owner_user_id
-- actually owns person_id.
create policy "person_shares_insert_owner_or_organiser"
  on public.person_shares for insert
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'organiser')
    )
  );

-- Only the sharing owner can change flags or revoke — not the circle at
-- large, and not organisers acting on someone else's person.
create policy "person_shares_update_owner"
  on public.person_shares for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Additive visibility for people/important_dates/memories, on top of each
-- table's existing *_select_own policy (never touched here — see
-- docs/decisions for the additive-RLS pattern rationale).

create policy "people_select_shared_via_circle"
  on public.people for select
  using (
    exists (
      select 1
      from public.person_shares ps
      join public.circle_members cm on cm.circle_id = ps.circle_id
      where ps.person_id = people.id
        and ps.revoked_at is null
        and cm.user_id = auth.uid()
    )
  );

create policy "important_dates_select_shared_via_circle"
  on public.important_dates for select
  using (
    exists (
      select 1
      from public.person_shares ps
      join public.circle_members cm on cm.circle_id = ps.circle_id
      where ps.person_id = important_dates.person_id
        and ps.revoked_at is null
        and cm.user_id = auth.uid()
    )
  );

-- The one place the flag actually gates access: sensitivity = 'standard'
-- is a hardcoded condition (not just the default), so a sensitive memory
-- is never visible to a circle member no matter how share_memories is set
-- — see docs/product.md's "sensitive memories are excluded ... by default"
-- and the exit gate's "private notes never shared with other circle
-- members by default" (this makes it true unconditionally, not just by
-- default).
create policy "memories_select_shared_via_circle"
  on public.memories for select
  using (
    sensitivity = 'standard'
    and exists (
      select 1
      from public.person_shares ps
      join public.circle_members cm on cm.circle_id = ps.circle_id
      where ps.person_id = memories.person_id
        and ps.revoked_at is null
        and ps.share_memories = true
        and cm.user_id = auth.uid()
    )
  );
