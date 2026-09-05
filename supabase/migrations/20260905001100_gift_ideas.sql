create table public.gift_ideas (
  id uuid primary key default gen_random_uuid(),
  -- Gift planning happens inside a circle (Master Build Prompt §11:
  -- "collaborative gift planning"), so access is governed entirely by
  -- circle membership + person_shares, not by an owner-only user_id
  -- column the way most other tables in this schema work.
  circle_id uuid not null references public.circles (id) on delete cascade,
  -- Plain FK, not the usual composite-to-owner pattern: the whole point is
  -- that people *other than* the person's owner create/view these rows.
  -- Application code and the RLS policies below are what actually enforce
  -- "only for a person genuinely shared into this circle" — a database FK
  -- can't express "shared into circle X" as a constraint.
  person_id uuid not null references public.people (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  occasion text,
  budget_amount numeric(10, 2) check (budget_amount is null or budget_amount >= 0),
  -- ISO 4217. Single-currency-per-idea is enough for a personal-use tool;
  -- no multi-currency conversion is attempted anywhere in this feature.
  budget_currency text check (budget_currency is null or char_length(budget_currency) = 3),
  constraint gift_ideas_budget_currency_pairing
    check ((budget_amount is null) = (budget_currency is null)),
  deadline_at timestamptz,
  link_url text,
  -- No separate "history" table: a 'given' row *is* the past-gift record
  -- (Master Build Prompt's "previous-gift history" requirement), avoiding
  -- an unused second table for the same lifecycle.
  status text not null default 'idea'
    check (status in ('idea', 'planned', 'purchased', 'given')),
  -- Set when status moves past 'idea', so the app can warn about a
  -- duplicate plan before someone else independently buys the same thing.
  claimed_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.gift_ideas is
  'Collaborative gift ideas for a person shared into a circle. gift_collaborators (multi-person cost-splitting) is explicitly deferred — see docs/decisions and docs/roadmap.md.';

create index gift_ideas_circle_id_idx on public.gift_ideas (circle_id);
create index gift_ideas_person_id_idx on public.gift_ideas (person_id);
create index gift_ideas_person_status_idx on public.gift_ideas (person_id, status);

create trigger set_updated_at
  before update on public.gift_ideas
  for each row execute function public.set_updated_at();

alter table public.gift_ideas enable row level security;

-- Visible to a circle member only when the person is actively shared into
-- this exact circle with gift planning enabled, AND — unconditionally,
-- not as an opt-in — never to the member whose own linked_person_id is
-- this gift's recipient. Master Build Prompt §11: "Gift collaboration
-- must allow surprise planning without exposing it to the recipient."
create policy "gift_ideas_select_circle_member"
  on public.gift_ideas for select
  using (
    exists (
      select 1
      from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = auth.uid()
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );

create policy "gift_ideas_insert_circle_member"
  on public.gift_ideas for insert
  with check (
    created_by_user_id = auth.uid()
    and exists (
      select 1
      from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = auth.uid()
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );

-- Gift planning is deliberately collaborative rather than author-only:
-- any circle member who can see an idea can update its status/claim it,
-- not just whoever created it. The same surprise-exclusion applies to
-- both the row's current state and its proposed new state.
create policy "gift_ideas_update_circle_member"
  on public.gift_ideas for update
  using (
    exists (
      select 1
      from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = auth.uid()
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  )
  with check (
    exists (
      select 1
      from public.circle_members cm
      join public.person_shares ps
        on ps.circle_id = cm.circle_id and ps.person_id = gift_ideas.person_id
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = auth.uid()
        and ps.revoked_at is null
        and ps.share_gift_planning = true
        and (cm.linked_person_id is null or cm.linked_person_id <> gift_ideas.person_id)
    )
  );

-- Delete stays narrower than update: the creator, or the circle's
-- owner/organiser doing cleanup. (A member who cannot SELECT a row — the
-- surprise case — can never learn its id to target a delete, so no
-- additional exclusion is needed here.)
create policy "gift_ideas_delete_creator_or_manager"
  on public.gift_ideas for delete
  using (
    created_by_user_id = auth.uid()
    or exists (
      select 1 from public.circle_members cm
      where cm.circle_id = gift_ideas.circle_id
        and cm.user_id = auth.uid()
        and cm.role in ('owner', 'organiser')
    )
  );
