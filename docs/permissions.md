# Noyala — Permission matrix

Requested by `review.md`: "Define an explicit permission matrix for owned,
shared and collaborative records. Separate permission to view from
permission to edit, share, export and use in AI." This is that matrix,
kept current as each stage adds a new access mode. Where a stage hasn't
been built yet, the row says so explicitly rather than guessing ahead of
its design.

## Today (Stages 0-2): single-owner only

No sharing exists yet — every row below is `user_id = auth.uid()` via Row
Level Security (see `docs/architecture.md`). There is exactly one
principal per record: its owner.

| Resource | View | Edit | Delete | Export | Use in AI |
| --- | --- | --- | --- | --- | --- |
| `profiles` | Owner | Owner | Owner (via delete-account only — see `docs/state-transitions.md`) | Owner | n/a |
| `people` | Owner | Owner | Owner | Owner | n/a (see `important_dates`/`memories`) |
| `important_dates` | Owner | Owner | Owner | Owner | n/a until Stage 3 |
| `memories` | Owner | Owner | Owner (soft: archive; hard: cascades from person delete) | Owner | **Not yet enforced at the code level** — Stage 3 must exclude `sensitivity = 'sensitive'` by default and require explicit per-generation inclusion (Master Build Prompt §8, `docs/product.md`) |
| `message_drafts` / `message_history` | Owner | Owner (drafts only; history is append-only) | Owner | Not yet exposed | n/a — this *is* AI output, not AI input |
| `notification_deliveries` | Owner (read-only) | Service role only | Service role only | Not yet exposed | n/a |
| `outbox_jobs` | Nobody (not user data) | Service role only | Service role only | n/a | n/a |
| `consents` | Owner | Owner | Owner (withdraw, not delete — see state transitions) | Owner | n/a |

Cross-record isolation (a row carrying the right `user_id` but pointing at
someone else's `person_id`) is prevented at the schema level, not just by
convention: `important_dates`, `memories`, `message_drafts` and
`message_history` all carry a composite foreign key on
`(person_id, user_id)` against a matching unique constraint on `people`,
so such a row cannot exist even if application code had a bug. Verified
live by attempting exactly that cross-reference against the seeded test
users — see `docs/stage-reports/stage-1.md` and `stage-2.md`.

## Not yet built — filled in when each stage lands

**Stage 6 (shared circles):** needs its own view here before any
migration is written, covering at minimum:
- Roles: owner, organiser, viewer (Master Build Prompt §11).
- Per-person, per-field sharing grants — RLS governs *rows*; field-level
  sharing needs either a separate "shared fields" projection/view the
  RLS-visible role can query, or column-level grants combined with a
  view, decided before `person_shares` is migrated. A flat "shared = true"
  boolean on `people` would not satisfy "sensitive memories are never
  shared by default."
- Whether "edit" and "share" are ever separable for a non-owner (the
  product doc doesn't require collaborative editing, only shared
  visibility plus collaborative gift planning).
- Surprise-gift visibility: the gift recipient, if also a circle member,
  must never see gifts about themselves — a filter on the *viewing user*,
  not just the record owner, so `gifts`/`gift_ideas` RLS needs a
  `recipient_person_id <> current viewer's linked person` condition once
  circle members can be mapped to a `person` row.

**Stage 4 (contact sync) / Stage 8 (billing/admin):** support-staff and
integration-service access levels (Master Build Prompt §14: "Support
staff must not see message bodies, contact details or memories by
default") — not designed yet; needs its own row set once the admin
console exists.
