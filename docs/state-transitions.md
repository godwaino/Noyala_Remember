# Noyala — State-transition definitions

Requested by `review.md`: "State-transition definitions: reminders,
approvals, scheduled messages, imports and deletion." Documented here as
each is actually built, plus the design decisions this review prompted
for stages that don't exist yet — so those decisions are settled *before*
the code that needs them, not improvised mid-stage.

## Outbox jobs (`outbox_jobs.status`) — built, Stage 1

```
pending ──claim──▶ processing ──success──▶ succeeded
   ▲                    │
   │                 failure (attempts left)
   │                    ▼
   └──────────────── failed ──claim (available_at reached)──┐
                                                              │
processing ──stale for >10min, attempts exhausted──▶ dead_letter
processing ──stale for >10min, attempts left────────▶ processing (reclaimed)
```

- `claim_outbox_job` (see `supabase/migrations/20260905000000_reclaim_stale_outbox_jobs.sql`)
  is the only way `pending`/`failed` → `processing` happens, and it's
  `SELECT ... FOR UPDATE SKIP LOCKED`, so concurrent workers can't
  double-claim.
- **Crash recovery**, the gap `review.md` flagged ("what happens when a
  worker crashes before recording success"): a job stuck in `processing`
  for longer than `stale_after` (default 10 minutes) is eligible for
  reclaim on the next `claim_outbox_job` call. If it has already used up
  `max_attempts`, it's dead-lettered instead of reclaimed forever.
  Verified live: seeded a job "stuck" processing for 15 minutes with
  attempts remaining (reclaimed, attempt count incremented) and one with
  none remaining (dead-lettered, not reclaimed) — see
  `docs/stage-reports/stage-2.md` and `scripts/ci/outbox-smoke-test.sh`,
  which CI runs on every push.
- `succeeded` and `dead_letter` are terminal — nothing transitions out of
  them. A dead-lettered job needs a human/operator action (Stage 8's admin
  console, not yet built) to requeue if it should still happen.

## Reminder deliveries (`notification_deliveries.status`) — schema built (Stage 1), producer not yet built (Stage 2 remaining work)

```
scheduled ──sent──▶ sent
scheduled ──failed (retries exhausted)──▶ failed
scheduled ──date/time changed before delivery──▶ cancelled (new row scheduled instead)
```

- The table and dedup-key uniqueness exist; the reminder-discovery job
  that actually creates and transitions these rows is Stage 2's remaining
  work (`docs/roadmap.md`).
- **Decision, resolved now per `review.md`'s "catch-up behaviour after
  downtime and changes to dates or timezones":** a changed important-date
  (edited month/day/year/timezone) must cancel any `scheduled` delivery
  rows tied to the old computed occurrence and let the next
  reminder-discovery run recompute + reschedule fresh ones under new
  dedup keys — never mutate a `scheduled` row's timestamp in place, so the
  audit trail shows the change rather than silently moving a reminder.
  Not yet implemented (no producer exists yet); tracked here so the
  reminder-discovery job is built against this rule from the start.
- **Decision on downtime catch-up:** if the reminder-discovery job doesn't
  run for a period (deploy outage, etc.), on next run it must schedule
  reminders for any date whose window it missed only if `today` is still
  on-or-before the occurrence date itself (never send a "birthday is
  tomorrow" reminder for a birthday that already passed) — i.e. clamp to
  the `0`-day-offset case rather than back-filling multiple missed offsets
  for the same occurrence.

## Message approval — not built yet (Stage 3); binding decided now

`review.md`: "Some passages require reviewing every message; others
permit channel/category policies... state whether approval always binds
to exact content and recipient."

**Decision:** approval binds to the exact final content, channel and
recipient at the moment of approval. Any change after that — edited text,
different channel, different person — invalidates the approval and
requires a fresh one. This applies whether the immediate action is a
copy/open-app handoff (Stage 3) or a later scoped scheduled send (Stage
4). A `message_drafts` row's `content` is only ever read for a handoff
immediately after the user's copy/open-app action in the same request; a
scheduled/direct send (Stage 4) will need its own `approved_content_hash`
or equivalent snapshot column captured at approval time, checked again at
send time, so a draft edited after approval can't be sent under the old
approval.

## Deletion and snapshots — not built yet (Stage 3 for real content; decision made now)

`review.md`: "Immutable draft context can retain a memory after the
original memory is deleted... define deletion across drafts, snapshots,
transcripts, search indexes, exports and queued work."

**Decision:** `message_drafts.context_snapshot` stores the *facts*
included at generation time as structured data (which memory IDs, and a
copy of their content at that moment), specifically so the user can see
what informed a draft even after editing the source memory later — that's
the feature, from Master Build Prompt §8 ("Store the exact selected
context snapshot with the draft"). Deleting the *memory* must not delete
the *snapshot* (the draft still needs to make sense), but deleting the
*person* already cascades `message_drafts` away entirely (composite FK,
built in Stage 1), which also removes every snapshot referencing them.
Delete-account cascades the same way from `auth.users`. Net effect: a
snapshot only outlives its source memory while the person/account still
exists, never independently. No further "redact within the snapshot"
mechanism is needed given that cascade — noted here so Stage 3 doesn't
have to re-derive it, and re-check it against the actual `message_drafts`
usage once real content exists.

Voice-capture transcripts (Stage 7) and search indexes/exports aren't
built yet; this section gets a dedicated addendum when they are, per the
same principle (define the deletion behavior in the same stage the
feature is designed, not after).

## People / memories archive and delete — built, Stage 2

```
active ──archive──▶ archived ──restore──▶ active
active ──delete (permanent, confirmed)──▶ gone (cascades important_dates, memories, message_drafts, message_history)
archived ──delete (permanent, confirmed)──▶ gone (same cascade)
```

Archive is reversible and hides a person/memory from default list views
without losing data. Delete is permanent and immediate — there is no
"trash" tier. Verified live: deleting a person with dates and memories
attached leaves zero rows behind for either (`docs/stage-reports/stage-2.md`).

## Account deletion — built, Stage 2

```
active account ──type "DELETE" + confirm──▶ auth.users row deleted (Admin API)
                                              └─▶ cascades: profiles, people (and everything under people), consents
```

One Admin API call (`supabase.auth.admin.deleteUser`) is sufficient
because every table is reachable by an `ON DELETE CASCADE` chain from
either `auth.users` directly or from `people`. Not yet run against the
live project — this environment's Supabase connection doesn't expose the
service-role key the Admin API needs (`docs/roadmap.md`).

## Consents (`consents.withdrawn_at`) — built, Stage 1

```
(no row) ──grant──▶ granted (withdrawn_at is null)
granted ──withdraw──▶ withdrawn (withdrawn_at set; row kept for audit)
```

Withdrawing never deletes the row — the partial unique index
(`user_id, consent_type` where `withdrawn_at is null`) allows re-granting
afterward as a new active row while the withdrawal stays on the historical
record.
