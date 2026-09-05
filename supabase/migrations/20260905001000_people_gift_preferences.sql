-- Master Build Prompt §6/§12: gift ideas need "recipient preferences and
-- exclusions" as durable facts about the person, not per-idea fields —
-- someone's general likes/allergies/no-gos don't change per gift. Covered
-- by the existing people RLS (owner + Stage 6's shared-via-circle policy)
-- without any new policy.
alter table public.people
  add column gift_preferences text,
  add column gift_exclusions text;

comment on column public.people.gift_preferences is
  'Freeform durable gift preferences (sizes, interests, favourites) — not per-idea.';
comment on column public.people.gift_exclusions is
  'Freeform durable gift no-gos (allergies, already-owns, dislikes) — not per-idea.';
