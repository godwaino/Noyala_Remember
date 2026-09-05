# 6. The outbox reclaims stale "processing" jobs instead of leaving crashed work stuck forever

Date: 2026-09-05

## Status

Accepted

## Context

`review.md`: "'Avoid duplicate delivery' is stated without defining what
happens when a provider accepts a request and the worker crashes before
recording success." The original `claim_outbox_job` (Stage 1) only ever
picked up `pending`/`failed` jobs — a job a crashed worker had already
marked `processing` was never revisited by anything, a real bug, not a
hypothetical.

## Decision

`claim_outbox_job` also reclaims any job stuck in `processing` for longer
than `stale_after` (default 10 minutes — comfortably longer than any job
this app runs today). A stale job that has already used its `max_attempts`
is dead-lettered instead of being reclaimed forever, matching how
`markFailed` already dead-letters an exhausted job on the happy path. See
`supabase/migrations/20260905000000_reclaim_stale_outbox_jobs.sql` and
`docs/state-transitions.md` for the full lifecycle diagram.

This does not solve provider-side idempotency (a provider that actually
accepted the send before the crash, vs. one that never received it) —
that needs a per-provider "uncertain delivery" reconciliation policy,
which can't be designed generically before a real provider exists. It
solves the narrower, generic problem: no job silently vanishes from the
system just because the worker processing it died.

## Consequences

- Any real send/notification provider adapter (Stage 2's reminder
  adapters, Stage 4's direct send) must still define what "success" means
  before calling `markSucceeded` — e.g. only after the provider confirms
  acceptance, not merely after the HTTP call returns — since a reclaim
  will otherwise retry a job whose side effect already happened.
- Verified live and covered by CI: `scripts/ci/outbox-smoke-test.sh` seeds
  a stale-but-retriable and a stale-and-exhausted job and asserts both
  outcomes on every push.
