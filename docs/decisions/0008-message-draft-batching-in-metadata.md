# 8. Group generated message options via `model_metadata`, not a new column

Date: 2026-09-05

## Status

Accepted

## Context

Master Build Prompt §8 requires "exactly three message options plus brief
labels" per generation, and §5's `message_drafts` schema is one row per
message with a `model_metadata` jsonb column for "minimal model metadata
needed for debugging and cost control" — it doesn't define a batch/grouping
column or a per-option label column. The UI still needs to: render the
three options from one generation together, know which option is which
("Classic"/"Playful"/"Heartfelt"), and let a user regenerate without losing
the previous batch (the "version history" requirement).

## Decision

Store `{ batchId, optionLabel, provider, generation: {...} }` inside each
row's existing `model_metadata` column instead of adding new columns. All
three rows from one generation share the same `batchId` (a fresh UUID);
`getDraftBatch` groups them with a PostgREST JSON-path filter
(`model_metadata->>batchId`). Regenerating creates a new `batchId` — the
old batch's rows are untouched and remain reachable at
`/people/{id}/drafts/{batchId}`, which is this stage's version history:
every past generation stays browsable, nothing is overwritten.
`generation` also carries the original request inputs (occasion, tone,
channel, custom instruction, linked date, selected memory ids) so the
Message Studio's "Regenerate with different wording" link can prefill the
form from a past batch without a separate table.

## Consequences

- No migration needed this stage — `message_drafts` is used exactly as
  Stage 1 defined it.
- The `model_metadata->>batchId` filter is a JSON-path query, not an
  indexed column — fine at this app's scale (a handful of drafts per
  person), but would need a real `batch_id` column with an index if this
  table ever needed to group at volume.
- If a future stage needs to query "all batches" efficiently (e.g. an
  admin view across every user), the metadata-jsonb approach won't scale
  as well as a column — revisit then rather than pre-optimizing now.
