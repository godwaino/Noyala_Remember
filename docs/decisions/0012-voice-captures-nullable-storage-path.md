# 12. voice_captures.storage_path must be nullable, not just non-empty

Date: 2026-09-05

## Status

Accepted

## Context

Master Build Prompt §13's exit gate requires "deletion of the audio
independently of the approved text" — a user can delete just the raw
recording while keeping its transcript and any memories it produced. The
first migration modeled this as `storage_path text not null check
(char_length(trim(storage_path)) > 0)` plus a nullable `audio_deleted_at`
timestamp, on the reasoning that "delete the audio" meant clearing
`storage_path` to an empty string.

Live verification caught the contradiction immediately: clearing
`storage_path` to `''` violates its own non-empty CHECK constraint, so the
one state the feature exists to reach — "this row's audio is gone" — was
unreachable. The constraint was right to forbid a blank-but-present path
(that would silently point at nothing); the schema was wrong to make
`storage_path` `not null` in the first place.

## Decision

`storage_path` is nullable. `null` means "no audio file" (never
recorded, or deliberately deleted); a non-null value must still be
non-empty, which the existing CHECK constraint already enforces correctly
once null values pass through it for free (Postgres CHECK constraints
don't fire on null). `audio_deleted_at` being non-null is the actual
signal the app reads to distinguish "never had audio" from "audio was
deleted" when `storage_path` is null in both cases.

See `supabase/migrations/20260905001500_voice_captures_nullable_storage_path.sql`.

## Consequences

- Any future column meant to be "present or explicitly cleared" should
  default to nullable from the start; a non-null column with a
  non-empty CHECK is only correct when the row can never legitimately
  reach a "no value" state.
- Verified live end-to-end: set `storage_path = null` and
  `audio_deleted_at = now()` on a row with an existing transcript,
  confirmed the transcript and its already-accepted memory both survived
  untouched. See `docs/stage-reports/stage-7.md`.
