# Stage 7 — Native mobile and voice capture (partial)

## Scope decision, made before any code was written

Stage 7's own deliverable is a native (Expo/React Native) mobile app, and
its exit gate requires "essential journeys pass on supported iOS and
Android targets." This environment has no iOS/Android simulator or device
— a scaffolded Expo app could be typechecked here but never actually run,
so its on-device journeys could never be verified, only assumed. Put
directly to the user before starting: build the schema/RLS/domain logic
now (all fully verifiable) and skip the native client until a real
device/simulator or mobile-capable CI runner is available, rather than
build a client no one can run or test here. The user chose that option.
This report covers what was actually built under that scope, not the full
Stage 7 deliverable list.

## Delivered

### Schema (`voice_captures`, `extracted_memory_candidates`)
- `voice_captures`: nullable `storage_path` (private recording reference —
  nullable because "no audio" is a real, reachable state, not just
  "not yet recorded" — see the bug below), `duration_seconds`,
  `transcription_status` (pending/processing/succeeded/failed),
  `transcript`, and `audio_deleted_at` for independent audio deletion
  (Master Build Prompt §13). `person_id` is a plain, nullable FK
  (`on delete set null`) — a note can be recorded before deciding who
  it's about, corrected during review rather than fixed at capture time;
  same reasoning as `gift_ideas.person_id` in Stage 6.
- `extracted_memory_candidates`: `proposed_content`/`proposed_category`,
  a `status` (pending/accepted/rejected) that gates whether a candidate
  ever becomes a real memory, and `resulting_memory_id` (plain, nullable
  FK) as the source linkage back to the `memories` row once accepted.
  Composite FK to `voice_captures(id, user_id)` with `on delete cascade` —
  the required, same-owner relationship every other child table in this
  schema uses.
- No delete policy on `extracted_memory_candidates` — reviewing is an
  update (`status` → accepted/rejected), not a delete, matching this
  schema's `consents`/`circle_invitations` soft-state precedent so the
  review history stays intact.

### Domain logic (`packages/domain/src/voice-capture.ts`)
- `TranscriptionProvider` interface + `createDeterministicTranscriptionProvider()`
  — no speech-to-text credential exists in this environment (the same gap
  Stage 3 hit with `AI_PROVIDER_API_KEY`), so only the interface and a
  clearly-labelled (`provider: "demo"`) mock exist; a real adapter is a
  drop-in implementation later, not a redesign, exactly like Stage 3's
  `AIMessageProvider`/OpenAI-adapter split.
- `extractFactCandidates`: splits a transcript into one candidate per
  sentence — an honest placeholder for real NLP/LLM extraction, not a
  claim of good extraction; every candidate requires human review before
  becoming a memory regardless of how it was proposed, so a rough split is
  an acceptable placeholder.
- Offline capture queue (`enqueueOfflineCapture`, `nextOfflineCaptureToUpload`,
  `markOfflineCaptureUploading/Uploaded/Failed`): a pure state machine for
  "record now, upload once connectivity allows," with retry-then-give-up
  semantics mirroring `outbox.ts`'s attempt-count/dead-letter shape, and
  "never start a second concurrent upload" as the safe-conflict-handling
  rule. Framework-free, so it's reusable by web or the future mobile app
  without depending on a particular storage/network layer.

## A real bug found by live verification, not code review

The first migration made `voice_captures.storage_path` `not null` with a
non-empty CHECK constraint, on the assumption that "delete the audio"
meant clearing it to `''`. Live verification hit the contradiction
immediately: an empty string violates the constraint's own non-empty
check, so the one state the feature exists to reach — "this row's audio
is gone" — was unreachable by the schema as written. Fixed by making the
column nullable (`null` = no audio; a non-null value must still be
non-empty, which the existing CHECK now correctly enforces since Postgres
CHECK constraints pass automatically on `null`). Full writeup:
`docs/decisions/0012-voice-captures-nullable-storage-path.md`.

## Verification against the live project

Seeded two throwaway users directly against the live Supabase project:

- **Cross-user isolation**: user B sees zero of user A's `voice_captures`
  and zero `extracted_memory_candidates` rows.
- **Transcription completing**: updated a capture's `transcription_status`
  to `succeeded` with a transcript, as its owner.
- **Review gate**: inserted two pending candidates from that transcript;
  accepted one (inserted a real `memories` row, set
  `resulting_memory_id`/`reviewed_at`/`status = accepted`) and rejected the
  other (`status = rejected`, `resulting_memory_id` stays null) — both
  confirmed via a role-neutral (`reset role`) check afterward, not by
  re-querying as the acting user (the exact mistake corrected during
  Stage 5's verification, deliberately avoided here throughout).
- **Independent audio deletion**: set `storage_path = null` and
  `audio_deleted_at = now()` on the capture — confirmed the transcript
  was still present immediately after.
- **Source linkage survives audio deletion**: deleted the `voice_captures`
  row entirely afterward — confirmed its `extracted_memory_candidates`
  rows cascade-deleted (bookkeeping cleanup) while the already-accepted
  `memories` row remained completely untouched, proving an approved fact
  doesn't depend on the raw recording continuing to exist.
- **`person_id` set-null-on-delete**: created a person, linked a capture
  to them, deleted the person — confirmed the capture row survived with
  `person_id` set to `null` rather than being destroyed.
- All seeded rows and both fake `auth.users` removed afterward; confirmed
  the real user's account was the only one left. `get_advisors` shows no
  new findings beyond the pre-existing/expected ones already tracked in
  earlier stage reports.

## Test and build results

- `pnpm -r typecheck` — clean.
- `pnpm -r lint` — clean (one pre-existing-pattern warning, 0 errors).
- `pnpm -r test` — 174/174 passing (138 in `@noyala/domain`, up from 128:
  +10 for `voice-capture.ts`; 36 in `@noyala/web`, unchanged — no web UI
  was built this round since the feature is mobile-scoped).
- `pnpm --filter @noyala/web build` — succeeds; no new routes (nothing in
  `apps/web` changed this stage).

## Known limitations — not gaps, a scoped decision

- **The native mobile app itself is not started.** No iOS/Android
  simulator or device exists in this environment; see "Scope decision"
  above and `docs/roadmap.md`'s "Stage 7 remaining work" for exactly
  what's left once one is available.
- **No real speech-to-text.** `TranscriptionProvider`'s only
  implementation is the deterministic mock — no provider credential
  exists in this environment.
- **No web UI for voice capture.** The feature is scoped to mobile by the
  Master Build Prompt; building it on web instead would be scope the
  product design doesn't call for, even though it would be more testable
  here.

## What's next

Schema, RLS, and domain logic for voice capture and reviewed memory
extraction are built and verified live. The native client, real
transcription, and their on-device exit-gate journeys remain open until a
device/simulator or mobile-capable CI runner is available — see
`docs/roadmap.md`.
