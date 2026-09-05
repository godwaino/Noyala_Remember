# 5. Draft context snapshots are covered by the existing cascade, not redacted independently

Date: 2026-09-05

## Status

Accepted

## Context

`review.md`: "Immutable draft context can retain a memory after the
original memory is deleted... define deletion across drafts, snapshots,
transcripts, search indexes, exports and queued work." The immutability
of `message_drafts.context_snapshot` is deliberate (Master Build Prompt
§8: "Store the exact selected context snapshot with the draft so the user
can understand what informed it") — deleting a memory shouldn't rewrite
history the user is meant to be able to audit.

## Decision

Do not build a separate "redact this memory's content out of every past
snapshot" mechanism. Instead, rely on the cascade already built in Stage
1: `message_drafts` carries a composite foreign key to `people`, so
deleting a person removes every draft (and snapshot) about them; deleting
the account cascades the same way from `auth.users`. A snapshot can only
outlive the memory it was built from while the person and account still
exist — never independently of both.

## Consequences

- A user who deletes one memory but keeps the person will still see old
  drafts referencing that memory's old content in their snapshot. That's
  intended (audit trail), not a bug — re-check this against real
  `message_drafts` usage once Stage 3 ships it, since this decision was
  made ahead of that stage existing.
- If a future requirement needs per-memory redaction independent of
  deleting the whole person, that's a new decision superseding this one,
  not an extension of it — flag it rather than bolting it on quietly.
- Voice-capture transcripts (Stage 7) and search indexes/exports are out
  of scope for this ADR; each needs its own deletion decision when built.
