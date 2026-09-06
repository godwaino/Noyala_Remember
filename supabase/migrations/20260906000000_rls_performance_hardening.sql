-- Stage 9 hardening: Supabase's performance advisor flagged two real,
-- mechanical issues across every RLS policy added since Stage 1:
--
-- 1. `auth_rls_initplan` (70 occurrences): every policy calls `auth.uid()`
--    (or `auth.email()`) directly in its USING/WITH CHECK clause. Postgres
--    cannot cache a volatile-looking function call across rows, so it
--    re-evaluates it once per row scanned instead of once per query.
--    Wrapping the call as `(select auth.uid())` lets the planner treat it
--    as an initplan evaluated exactly once per query — same result, no
--    per-row cost. This changes zero authorization behaviour: `auth.uid()`
--    already only ever returns one value for the lifetime of a request.
--
-- 2. `multiple_permissive_policies` (40 occurrences, 8 distinct
--    table/action pairs): several tables carry two separate PERMISSIVE
--    policies for the same command (e.g. `people_select_own` and
--    `people_select_shared_via_circle`) because Stage 6 added
--    circle-sharing visibility alongside Stage 2's ownership visibility.
--    Postgres already combines multiple permissive policies for the same
--    command with OR, so this was never a correctness bug — but it means
--    the planner evaluates two separate quals (each potentially a
--    subquery) instead of one, on every row. Each pair below is merged
--    into the single surviving policy's USING/WITH CHECK by literally
--    OR-ing the two original clauses — mathematically identical to what
--    Postgres was already doing, just evaluated as one qual instead of
--    two. The now-redundant policy is dropped.
--
-- Every USING/WITH CHECK clause quoted here is copied from the live
-- policy definitions (`pg_policies`) before this migration, with only
-- `auth.uid()` / `auth.email()` occurrences wrapped and, for the 8 merge
-- targets, the second policy's clause OR-ed in. No table's actual set of
-- visible/writable rows changes.

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter policy "profiles_select_own" on public.profiles
  using ((select auth.uid()) = user_id);
alter policy "profiles_insert_own" on public.profiles
  with check ((select auth.uid()) = user_id);
alter policy "profiles_update_own" on public.profiles
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- people (merge: select_own + select_shared_via_circle)
-- ---------------------------------------------------------------------
alter policy "people_select_own" on public.people
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.person_shares ps
      join public.circle_members cm on cm.circle_id = ps.circle_id
      where ps.person_id = people.id
        and ps.revoked_at is null
        and cm.user_id = (select auth.uid())
    )
  );
drop policy "people_select_shared_via_circle" on public.people;
alter policy "people_insert_own" on public.people
  with check ((select auth.uid()) = user_id);
alter policy "people_update_own" on public.people
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "people_delete_own" on public.people
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- important_dates (merge: select_own + select_shared_via_circle)
-- ---------------------------------------------------------------------
alter policy "important_dates_select_own" on public.important_dates
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.person_shares ps
      join public.circle_members cm on cm.circle_id = ps.circle_id
      where ps.person_id = important_dates.person_id
        and ps.revoked_at is null
        and cm.user_id = (select auth.uid())
    )
  );
drop policy "important_dates_select_shared_via_circle" on public.important_dates;
alter policy "important_dates_insert_own" on public.important_dates
  with check ((select auth.uid()) = user_id);
alter policy "important_dates_update_own" on public.important_dates
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "important_dates_delete_own" on public.important_dates
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- memories (merge: select_own + select_shared_via_circle)
-- ---------------------------------------------------------------------
alter policy "memories_select_own" on public.memories
  using (
    (select auth.uid()) = user_id
    or (
      sensitivity = 'standard'
      and exists (
        select 1 from public.person_shares ps
        join public.circle_members cm on cm.circle_id = ps.circle_id
        where ps.person_id = memories.person_id
          and ps.revoked_at is null
          and ps.share_memories = true
          and cm.user_id = (select auth.uid())
      )
    )
  );
drop policy "memories_select_shared_via_circle" on public.memories;
alter policy "memories_insert_own" on public.memories
  with check ((select auth.uid()) = user_id);
alter policy "memories_update_own" on public.memories
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "memories_delete_own" on public.memories
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- message_drafts / message_history / notification_deliveries / consents
-- ---------------------------------------------------------------------
alter policy "message_drafts_select_own" on public.message_drafts
  using ((select auth.uid()) = user_id);
alter policy "message_drafts_insert_own" on public.message_drafts
  with check ((select auth.uid()) = user_id);
alter policy "message_drafts_update_own" on public.message_drafts
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "message_drafts_delete_own" on public.message_drafts
  using ((select auth.uid()) = user_id);

alter policy "message_history_select_own" on public.message_history
  using ((select auth.uid()) = user_id);
alter policy "message_history_insert_own" on public.message_history
  with check ((select auth.uid()) = user_id);

alter policy "notification_deliveries_select_own" on public.notification_deliveries
  using ((select auth.uid()) = user_id);

alter policy "consents_select_own" on public.consents
  using ((select auth.uid()) = user_id);
alter policy "consents_insert_own" on public.consents
  with check ((select auth.uid()) = user_id);
alter policy "consents_update_own" on public.consents
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- follow_ups / interactions / push_subscriptions / voice_captures /
-- extracted_memory_candidates — one policy per action, wrap only
-- ---------------------------------------------------------------------
alter policy "follow_ups_select_own" on public.follow_ups
  using ((select auth.uid()) = user_id);
alter policy "follow_ups_insert_own" on public.follow_ups
  with check ((select auth.uid()) = user_id);
alter policy "follow_ups_update_own" on public.follow_ups
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "follow_ups_delete_own" on public.follow_ups
  using ((select auth.uid()) = user_id);

alter policy "interactions_select_own" on public.interactions
  using ((select auth.uid()) = user_id);
alter policy "interactions_insert_own" on public.interactions
  with check ((select auth.uid()) = user_id);
alter policy "interactions_update_own" on public.interactions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "interactions_delete_own" on public.interactions
  using ((select auth.uid()) = user_id);

alter policy "push_subscriptions_select_own" on public.push_subscriptions
  using ((select auth.uid()) = user_id);
alter policy "push_subscriptions_insert_own" on public.push_subscriptions
  with check ((select auth.uid()) = user_id);
alter policy "push_subscriptions_update_own" on public.push_subscriptions
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "push_subscriptions_delete_own" on public.push_subscriptions
  using ((select auth.uid()) = user_id);

alter policy "voice_captures_select_own" on public.voice_captures
  using ((select auth.uid()) = user_id);
alter policy "voice_captures_insert_own" on public.voice_captures
  with check ((select auth.uid()) = user_id);
alter policy "voice_captures_update_own" on public.voice_captures
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
alter policy "voice_captures_delete_own" on public.voice_captures
  using ((select auth.uid()) = user_id);

alter policy "extracted_memory_candidates_select_own" on public.extracted_memory_candidates
  using ((select auth.uid()) = user_id);
alter policy "extracted_memory_candidates_insert_own" on public.extracted_memory_candidates
  with check ((select auth.uid()) = user_id);
alter policy "extracted_memory_candidates_update_own" on public.extracted_memory_candidates
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- circles (merge: select_owner + select_peer_member)
-- ---------------------------------------------------------------------
alter policy "circles_select_owner" on public.circles
  using (
    owner_user_id = (select auth.uid())
    or public.is_circle_member(id, (select auth.uid()))
  );
drop policy "circles_select_peer_member" on public.circles;
alter policy "circles_insert_own" on public.circles
  with check (owner_user_id = (select auth.uid()));
alter policy "circles_update_owner" on public.circles
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));
alter policy "circles_delete_owner" on public.circles
  using (owner_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- circle_members (merge: select_self + select_circle_peers)
-- ---------------------------------------------------------------------
alter policy "circle_members_select_self" on public.circle_members
  using (
    user_id = (select auth.uid())
    or public.is_circle_member(circle_id, (select auth.uid()))
  );
drop policy "circle_members_select_circle_peers" on public.circle_members;
alter policy "circle_members_insert_owner_on_create" on public.circle_members
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and exists (
      select 1 from public.circles c
      where c.id = circle_members.circle_id
        and c.owner_user_id = (select auth.uid())
    )
  );
alter policy "circle_members_update_self" on public.circle_members
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy "circle_members_delete_self_or_owner" on public.circle_members
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.circles c
      where c.id = circle_members.circle_id
        and c.owner_user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- circle_invitations (merge: select_invitee + select_manager;
-- merge: update_invitee_decline + update_manager_revoke)
-- ---------------------------------------------------------------------
alter policy "circle_invitations_select_invitee" on public.circle_invitations
  using (
    lower(invited_email) = lower((select auth.email()))
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_invitations.circle_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['owner', 'organiser'])
    )
  );
drop policy "circle_invitations_select_manager" on public.circle_invitations;

alter policy "circle_invitations_update_invitee_decline" on public.circle_invitations
  using (
    (
      lower(invited_email) = lower((select auth.email()))
      and status = 'pending'
    )
    or (
      status = 'pending'
      and exists (
        select 1 from public.circle_members cm
        where cm.circle_id = circle_invitations.circle_id
          and cm.user_id = (select auth.uid())
          and cm.role = any (array['owner', 'organiser'])
      )
    )
  )
  with check (
    (status = 'declined' and lower(invited_email) = lower((select auth.email())))
    or (status = 'revoked')
  );
drop policy "circle_invitations_update_manager_revoke" on public.circle_invitations;

alter policy "circle_invitations_insert_manager" on public.circle_invitations
  with check (
    invited_by_user_id = (select auth.uid())
    and exists (
      select 1 from public.circle_members cm
      where cm.circle_id = circle_invitations.circle_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['owner', 'organiser'])
    )
  );

-- ---------------------------------------------------------------------
-- person_shares (merge: select_owner + select_circle_member)
-- ---------------------------------------------------------------------
alter policy "person_shares_select_owner" on public.person_shares
  using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = person_shares.circle_id
        and cm.user_id = (select auth.uid())
    )
  );
drop policy "person_shares_select_circle_member" on public.person_shares;
alter policy "person_shares_insert_owner_or_organiser" on public.person_shares
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.circle_members cm
      where cm.circle_id = person_shares.circle_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['owner', 'organiser'])
    )
  );
alter policy "person_shares_update_owner" on public.person_shares
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- gift_ideas — one policy per action, wrap only
-- ---------------------------------------------------------------------
alter policy "gift_ideas_select_circle_member" on public.gift_ideas
  using (
    exists (
      select 1 from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = (select auth.uid())
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );
alter policy "gift_ideas_insert_circle_member" on public.gift_ideas
  with check (
    created_by_user_id = (select auth.uid())
    and exists (
      select 1 from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = (select auth.uid())
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );
alter policy "gift_ideas_update_circle_member" on public.gift_ideas
  using (
    exists (
      select 1 from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = (select auth.uid())
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  )
  with check (
    exists (
      select 1 from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = (select auth.uid())
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );
alter policy "gift_ideas_delete_creator_or_manager" on public.gift_ideas
  using (
    created_by_user_id = (select auth.uid())
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = (select auth.uid())
        and cm.role = any (array['owner', 'organiser'])
    )
  );

-- ---------------------------------------------------------------------
-- Missing covering indexes on foreign keys (advisor: unindexed_foreign_keys).
-- Every composite FK here is the `(child_fk_col, user_id)`-style
-- defense-in-depth pattern from docs/decisions — a single-column index on
-- the leading column alone (already present on several of these tables)
-- doesn't cover a two-column FK, so Postgres falls back to a full scan on
-- cascade/restrict checks. Where a redundant single-column index already
-- existed on the FK's leading column, it's replaced by the composite
-- (still serves any query that only filters on the leading column).
-- ---------------------------------------------------------------------
create index if not exists circle_invitations_invited_by_user_id_idx
  on public.circle_invitations (invited_by_user_id);

create index if not exists extracted_memory_candidates_resulting_memory_id_idx
  on public.extracted_memory_candidates (resulting_memory_id);

drop index if exists public.extracted_memory_candidates_voice_capture_id_idx;
create index if not exists extracted_memory_candidates_voice_capture_id_user_id_idx
  on public.extracted_memory_candidates (voice_capture_id, user_id);

create index if not exists follow_ups_interaction_id_user_id_idx
  on public.follow_ups (interaction_id, user_id);

drop index if exists public.follow_ups_person_id_idx;
create index if not exists follow_ups_person_id_user_id_idx
  on public.follow_ups (person_id, user_id);

create index if not exists gift_ideas_claimed_by_user_id_idx
  on public.gift_ideas (claimed_by_user_id);
create index if not exists gift_ideas_created_by_user_id_idx
  on public.gift_ideas (created_by_user_id);

drop index if exists public.important_dates_person_id_idx;
create index if not exists important_dates_person_id_user_id_idx
  on public.important_dates (person_id, user_id);

drop index if exists public.interactions_person_id_idx;
create index if not exists interactions_person_id_user_id_idx
  on public.interactions (person_id, user_id);

drop index if exists public.memories_person_id_idx;
create index if not exists memories_person_id_user_id_idx
  on public.memories (person_id, user_id);

create index if not exists message_drafts_important_date_id_user_id_idx
  on public.message_drafts (important_date_id, user_id);
drop index if exists public.message_drafts_person_id_idx;
create index if not exists message_drafts_person_id_user_id_idx
  on public.message_drafts (person_id, user_id);

create index if not exists message_history_important_date_id_user_id_idx
  on public.message_history (important_date_id, user_id);
drop index if exists public.message_history_person_id_idx;
create index if not exists message_history_person_id_user_id_idx
  on public.message_history (person_id, user_id);

create index if not exists notification_deliveries_important_date_id_user_id_idx
  on public.notification_deliveries (important_date_id, user_id);

drop index if exists public.person_shares_person_id_idx;
create index if not exists person_shares_person_id_owner_user_id_idx
  on public.person_shares (person_id, owner_user_id);

-- ---------------------------------------------------------------------
-- unused_index (advisor, INFO level): important_dates_month_day_idx,
-- outbox_jobs_claim_idx, circle_invitations_invited_email_idx, and the
-- two person_id indexes just replaced above by composites were flagged
-- as unused. Deliberately not dropping any of them here — the project is
-- two days old with no real production traffic, so "unused" reflects an
-- empty stats window, not a genuinely dead index; the two person_id ones
-- are now covered by the composite indexes above anyway. Revisit once
-- real usage data exists (see docs/roadmap.md's Stage 9 section).
