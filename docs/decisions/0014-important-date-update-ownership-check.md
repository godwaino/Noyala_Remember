# 14. Explicitly check row ownership before a service-role follow-up write

Date: 2026-09-06

## Status

Accepted

## Context

`updateImportantDate` (`apps/web/src/server/important-dates/actions.ts`)
updates an `important_dates` row through the RLS-scoped client, then — per
`docs/state-transitions.md`'s edit-cancels-stale-reminders rule — cancels
any still-`scheduled` `notification_deliveries` row for it through the
service-role client, since that table has no authenticated-write policy.

Stage 9's security audit found the first update never checked whether it
actually affected a row. PostgREST does not return an error for a 0-row
update — if `dateId` belonged to a different user, RLS would silently
filter it to zero rows, `error` would stay `null`, and execution would
fall through to `cancelScheduledDeliveries(dateId)` regardless. That
function runs on the **service-role client**, which bypasses RLS
entirely, and only filtered by `important_date_id` — with no ownership
check of its own. Any authenticated user who obtained another user's
`important_date` UUID (visible in that date's own edit URL) could
silently cancel that other user's pending reminder. This is exactly the
pattern `docs/architecture.md` already commits to avoiding: "Service-role
credentials ... never in a request path reachable by user input without
an explicit authorization check" — the check existed for other
service-role call sites, just not this one.

## Decision

`updateImportantDate` now chains `.select("id")` onto the first update and
checks the result actually contains a row before calling
`cancelScheduledDeliveries`. A 0-row result (not-owned or already-deleted
`dateId`) returns an error to the form instead of silently proceeding to
the service-role write.

## Consequences

- Any future action that does "an RLS-scoped write, then a follow-up
  service-role write keyed off the same id" must check the first write's
  affected-row count explicitly — RLS silently filtering to zero rows is
  not an error PostgREST surfaces on its own.
- `deleteImportantDate` was checked and does not have this shape (no
  service-role follow-up), so it was left as-is; a 0-row RLS-filtered
  delete there is a harmless no-op, not a cross-user write.
