-- Optional per-person reconnect cadence (Master Build Prompt §4: "define an
-- optional reconnect cadence for selected people without gamifying
-- relationships"). Deliberately just a day-count and a snooze date — no
-- score, streak or ranking column exists here or anywhere else in this
-- schema; see docs/product.md.
alter table public.people
  add column reconnect_cadence_days integer check (reconnect_cadence_days is null or reconnect_cadence_days > 0),
  add column reconnect_snoozed_until date;
