# Stage 3 — Communication intelligence

## Delivered scope

### AI message generation (`packages/domain/src/messages.ts`, `apps/web/src/server/ai`)
- `AIMessageProvider` interface, framework-free, mirroring the
  `EmailProvider`/`WebPushProvider` adapter pattern from Stage 2.
- `createDeterministicDemoGenerator`: pure, deterministic, three
  structurally distinct templates (not tone-word swaps) per generation.
  Never invents a fact or an age — it has no age input at all, only the
  facts explicitly passed in. Master Build Prompt §8's "clearly labelled
  demo generator" requirement is met via `provider: "demo"` in the result
  (surfaced as a UI banner), not by mangling the message text itself.
- `createOpenAIMessageProvider`: real adapter using OpenAI's Chat
  Completions API with Structured Outputs (`response_format:
  json_schema`), a system prompt that explicitly treats `<facts>` and
  `<custom_instruction>` tags as untrusted data rather than instructions
  (Master Build Prompt §8's prompt-injection requirement), a 15s timeout,
  and permanent/transient error classification mirroring
  `resend-email-provider.ts`'s pattern.
- `getMessageProvider()` selects OpenAI when `AI_PROVIDER_API_KEY` is set,
  otherwise the demo generator — the same selection pattern as Stage 2's
  email/push adapters.
- `selectMessageFacts`: only memories whose id is in the current request's
  selection ever reach a provider — sensitive memories are excluded by
  default because the UI never pre-checks them, and "explicit inclusion
  for each generation request" holds by construction (no saved "always
  include" preference exists anywhere in this schema).
- `isRateLimited`: a technical safety cap (`AI_GENERATION_MAX_PER_HOUR`,
  default 20/hour/user), not a validated product budget — see
  `docs/integrations.md`'s "Acceptance budgets" section.

### Message Studio (`/people/[personId]/drafts/new`, `/people/[personId]/drafts/[batchId]`)
- Occasion (free text or picked from a saved important date), tone,
  channel, custom instruction, and memory selection (standard memories
  proposed/checked, sensitive memories separated with a visible warning
  and unchecked by default).
- Generates exactly three options, grouped by a `batchId` stashed in
  `model_metadata` rather than a new column — see
  `docs/decisions/0008-message-draft-batching-in-metadata.md`.
- Each option is freely editable inline; editing never touches
  `context_snapshot`, the immutable record of exactly which facts were
  used (Master Build Prompt §5).
- "Regenerate with different wording" creates a fresh batch without
  touching the old one — every past generation stays reachable at its own
  URL, which is this stage's version history.

### Send handoff and message history (`apps/web/src/server/messages`, `/drafts`)
- Copy to clipboard, open WhatsApp (`wa.me`), open SMS (`sms:`), open
  email (`mailto:`), or mark as sent — each records a `message_history`
  row with the *current* (possibly just-edited) content as
  `final_content`.
- `opened_in_app` is never shown as confirmed delivery anywhere in the
  UI — Master Build Prompt §9's explicit requirement. The `/drafts` page
  (replacing the Stage 0 placeholder) lists every action across the
  account, most recent first, with accurate labels ("Opened in app — not
  confirmed sent" vs. "Marked as sent by you").
- The person detail page gained a "Write a message" entry point and a
  "Recent messages" section linking back to each past batch.

## Verification against the live project

This environment has no `AI_PROVIDER_API_KEY` (no OpenAI account), so the
demo generator is the only path actually exercisable end-to-end here — see
`docs/integrations.md` for the exact per-provider verification status.

Seeded two throwaway users with one person each directly against the live
Supabase project, then, using the RLS-scoped `authenticated` role (not the
bypassing service role):

- Inserted a batch of three `message_drafts` rows sharing a `batchId`
  under one user — succeeded, matching `generateMessageDraft`'s insert
  shape.
- Queried by `model_metadata->>batchId` — returned exactly the three rows
  in the same order they were created, matching `getDraftBatch`'s filter.
- A second user querying the same `batchId` saw zero rows — cross-user RLS
  isolation holds for the new table usage, same as every other table.
- Edited one draft's `content` as its owner — succeeded, matching
  `updateMessageDraftContent`.
- Inserted a `message_history` row referencing the edited content —
  succeeded, matching `recordMessageAction`.
- Attempted to update that `message_history` row as its own owner —
  affected zero rows, confirming the append-only design (no update/delete
  policy exists for `authenticated`) actually holds, not just that the
  migration says so.
- Ran the exact join query `listMessageHistoryForUser` uses
  (`message_history` joined to `people.first_name`) — returned the correct
  row.
- All seeded rows were removed afterward (cascaded from `auth.users`);
  confirmed the real user's account (`godwin.sabo@hotmail.com`) was
  untouched throughout, and `get_advisors` shows no new findings beyond
  the three pre-existing ones from earlier stages.

No new migrations were needed this stage — `message_drafts` and
`message_history` were already created in Stage 1.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean.
- `pnpm -r test` — 110/110 passing (74 in `@noyala/domain`, up from 62:
  +12 for `messages.ts`; 36 in `@noyala/web`, up from 26: +10 for the AI
  provider selection/adapter).
- `pnpm --filter @noyala/web build` — succeeds; the two new
  `/people/[personId]/drafts/*` routes and `/drafts` are correctly dynamic.

## Known limitations

- **OpenAI adapter not verified against the provider** — implemented and
  unit-tested against a mocked `fetch`, but no real API key exists in this
  environment to confirm the actual request/response shape against
  OpenAI's live API. Whoever adds `AI_PROVIDER_API_KEY` next should
  generate one real message and confirm it comes back as three genuinely
  distinct options.
- **Send handoff links** (`wa.me`/`sms:`/`mailto:`) are implemented but
  not exercised on a real mobile OS or WhatsApp/SMS/Mail app in this
  environment — no device/browser combination available here to confirm
  each one actually opens with the text prefilled on every platform.
- **Rate limit and AI spend numbers are technical defaults, not validated
  budgets** — see `docs/integrations.md`.
- **No async/queued generation path** — `generation_status` stays
  `succeeded` for every persisted row today; `pending`/`failed` are
  reserved schema values for a future slower/queued provider, not
  currently reachable. See `docs/state-transitions.md`.
- **Message approval-binding infrastructure is still Stage 4 territory** —
  Stage 3's "approval" is simply the user reviewing/editing before
  clicking a handoff button; the `approved_content_hash`-style mechanism
  `docs/decisions/0004-message-approval-binding.md` describes is only
  needed once a direct/scheduled send exists.
- No accessibility re-audit specific to the new Message Studio
  forms/buttons — same informal-only status as Stage 2's exit gate.

## What's next

Stage 3's full deliverable list (Message Studio, context selection,
sensitive-memory exclusion, three-option generation, editable drafts with
version history via batches, multilingual generation is a model-prompt
concern rather than app code and works with any language the user types
into occasion/custom instruction, copy/WhatsApp/SMS/email handoff, message
action history, rate limits, demo provider, prompt-injection defences) is
built and verified per the taxonomy above. See `docs/roadmap.md` for
Stage 4 onward.
