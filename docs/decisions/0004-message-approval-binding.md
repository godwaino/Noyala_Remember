# 4. Message approval binds to exact content, channel and recipient

Date: 2026-09-05

## Status

Accepted

## Context

`review.md` flagged that the Master Build Prompt states both "review
every message" and "channel/category policies" for approval without
saying whether approval survives an edit made after the fact. Left
ambiguous, Stage 3/4 could ship a send path where editing a draft after
"approving" it sends the edited text without a fresh approval — exactly
the kind of accidental-autonomous-sending risk `docs/product.md` rules
out.

## Decision

Approval binds to the exact final content + channel + recipient at the
moment of approval. Any change to any of those three invalidates the
approval; sending (a handoff or, later, a direct/scheduled send) requires
re-approval of the new combination. See `docs/state-transitions.md` §
"Message approval" for the mechanism this implies for Stage 4's scheduled
sends (an approved-content hash/snapshot checked again at send time).

## Consequences

- Stage 3's Message Studio must not let a user regenerate or hand-edit a
  draft after copy/open-app without the UI making clear that's a new,
  separate action (which it already is, per Master Build Prompt §4's
  distinct "regenerate without losing the current version" step).
- Stage 4's scheduled-send approval UI must capture and re-check content
  at send time, not just at scheduling time.
