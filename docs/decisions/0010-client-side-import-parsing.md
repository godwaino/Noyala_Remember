# 10. Parse CSV/vCard imports client-side; no import-session table

Date: 2026-09-05

## Status

Accepted

## Context

Master Build Prompt §10 asks for CSV/vCard import with "preview, selectable
fields, duplicate matching, dry-run counts and an undo window" — a
multi-step wizard (upload → map fields → review/select → confirm). The
usual way to build this server-side is a staging table: upload creates a
row holding the parsed data, later steps reference it by id. That means a
new table whose only purpose is temporary scratch space for an import in
progress.

## Decision

Parse the file, guess the field mapping, and detect duplicates entirely
client-side, using the same pure functions
(`packages/domain/src/contact-import.ts`) a server action would otherwise
call. Only the final, user-confirmed candidate list crosses the network,
as JSON in a hidden form field to `confirmImport` — the one step that
actually writes to the database. No staging table, no import-session id,
no server round-trip for the parsing/mapping/preview steps.

This works because contact lists at this app's scale are at most a few
hundred rows — small enough to hold in browser memory and to send as one
form payload — and because `packages/domain` is framework-free by design
(Stage 0's founding constraint, so `apps/mobile` can reuse it later), so
the exact same parsing code already had to run somewhere JS executes,
without a Node-only dependency. Running it in the browser instead of a
server action costs nothing and avoids inventing persistence for data that
only needs to survive one page session.

## Consequences

- No `import_sessions`-style table exists, matching the master prompt's
  "define contracts and migrations incrementally rather than creating
  unused speculative tables."
- The undo window doesn't need one either: `confirmImport` returns the
  exact ids it just created, passed via the result page's URL — no
  `import_batch_id` column, no new state to clean up.
- This doesn't scale to very large imports (many thousands of rows) — the
  hidden-field JSON payload would get unwieldy. Not a concern at this
  app's actual scale; revisit with real numbers if it ever becomes one.
- The parsing logic is trusted to run correctly in the user's own browser;
  `confirmImport` still re-validates every candidate server-side
  (`validateCandidate`) rather than trusting the client blindly, since the
  payload is just JSON that crossed the network by the time the server
  sees it.
