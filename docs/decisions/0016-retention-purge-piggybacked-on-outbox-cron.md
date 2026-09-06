# 16. Retention purge runs inside the existing outbox cron, not a new schedule

Date: 2026-09-06

## Status

Accepted

## Context

Stage 9 ("backup/restore drill, disaster-recovery runbook and retention
jobs") found `outbox_jobs` and `notification_deliveries` had no retention
policy at all — every terminal-state row (`succeeded`/`dead_letter` on the
former; `sent`/`failed`/`cancelled` on the latter) accumulates forever.
Neither table is large today, but nothing bounds their growth, and
`notification_deliveries` backs a real user-visible UI
(`NotificationDeliveryList` on `/settings`), so purging has to be
selective, not "delete everything old."

## Decision

`purgeOldRecords` (`apps/web/src/server/outbox/purge-old-records.ts`)
deletes only terminal-state rows past a retention window: 30 days for
`outbox_jobs` (purely internal — nothing ever reads a finished job again)
and 365 days for `notification_deliveries` (kept far longer since it's
the account's own delivery history). Both numbers are technical
defaults, not validated product numbers — same caveat as
`AI_GENERATION_MAX_PER_HOUR` in `docs/integrations.md`.

It runs inside `/api/cron/process-outbox`'s existing daily invocation
rather than as its own Vercel cron entry. A purge this cheap and
idempotent doesn't need its own schedule, and it avoids adding a third
`vercel.json` cron entry for what one daily run already covers. A
purge failure is logged but does not fail the outbox-processing response
— reminder delivery must not block on cleanup.

## Consequences

- If retention windows ever need to differ per environment, `purgeOldRecords`
  already takes them as parameters — wiring them to env vars is additive,
  not a redesign.
- This does not address actual data backup/restore (see
  `docs/disaster-recovery.md`) — it only bounds table growth for rows
  that are already done with their job.
