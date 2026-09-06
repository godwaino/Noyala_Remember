# Stage 7 continuation — the native mobile app itself

`docs/stage-reports/stage-7.md` covered the schema/RLS/domain-logic half of
Stage 7 and deliberately stopped short of the Expo/React Native client
because that environment had no iOS/Android simulator or device to run one
against. This report picks up exactly where that one left off: `apps/mobile`
now exists, implements the resolved design in
`Noyala Mobile v2.dc.html` (a Claude Design handoff — see that bundle's
`chats/` for the design brief), and is wired against the real Supabase
project.

## Same constraint, different answer

This environment also has no iOS/Android simulator. Rather than repeat
Stage 7's original call (build only what's runnable, skip the rest), this
round found a middle path: Expo apps also target web via
`react-native-web`, and this environment has Chromium pre-installed. That
means the app's actual behavior — not just its typecheck — could be
exercised in a real browser via Playwright. Native-only surfaces (the
camera/microphone permission flow on a real OS, the native contact picker,
share-sheet handoffs, push tokens) still can't be verified here and are
called out explicitly below, not silently assumed to work.

## Delivered

### `apps/mobile` (Expo SDK 57, React Native 0.86, TypeScript)
Depends on `@noyala/domain` and `@noyala/brand` only (per
`docs/architecture.md`'s boundaries) — no dependency on `apps/web`. React
Navigation (native-stack root + bottom-tabs for Home/People/Calendar/More,
matching the design's collapsed four-tab IA). All 22 screens from the
design are implemented: onboarding (email + 6-digit code, profile setup,
permissions), Home, People (search/filter), Person (overview/memories/
timeline/gifts tabs), Occasion, Calendar, More, Message Studio (context →
three drafts → edit → approve → handoff), Drafts, Message history, Voice
capture → transcript review, Contacts import → duplicate resolution → undo
window, Add person (optional-year birthday), Add memory (sensitivity
choice), Log a connection, Circles, Circle detail, Sharing, Reminders,
Plan, Settings and privacy, Account.

### Design system
`packages/brand` gained an additive `mobileTokens` export (the v2 design's
refined clay/ivory palette, Newsreader + Inter type scale, 6/10/12/14/16
radius steps, 4/8/12/16/24/32/40 spacing) — additive because `tokens`
already ties `apps/web`'s Tailwind theme to Stage 9's accessibility-audited
contrast pairs; nothing there changed. `apps/mobile/src/theme` converts
those into RN-consumable numbers and a `Text` component with named
typography variants, so screens use `<Text variant="heroTitle">` rather
than repeating font shorthand.

### Data layer — direct Supabase, not a new backend
Every CRUD screen (people, dates, memories, interactions, follow-ups,
gift ideas, circles, members, invitations, person shares, consents,
profile) talks to Supabase directly under RLS via `@supabase/supabase-js`,
the same trust boundary `apps/web`'s browser client uses — no new API
surface needed for any of it. Row↔domain mappers are mechanically
duplicated from `apps/web/src/server/*/mappers.ts` (not imported — mobile
doesn't depend on web's server-only code) and kept 1:1 with them. Computed
views (Home's upcoming-occasions/reconnect-suggestions/follow-ups feed,
Calendar's month grid) call the exact same `@noyala/domain` pure functions
(`resolveUpcoming`, `getReconnectStatus`, `resolveObservedDate`, …)
`apps/web` calls from its own queries — this is precisely why
`packages/domain` was kept framework-free from Stage 1 onward.

### The two operations that do need a new server route
AI message generation and voice transcription both need a server-side
secret (the AI provider key; a future speech-to-text key) plus, for
generation, the per-user rate limiter — neither belongs in a phone's app
bundle. Rather than duplicate that logic, `apps/web/src/server/messages/actions.ts`'s
generation core was extracted into `apps/web/src/server/messages/generate.ts`
and is now called by both the existing `/people/[personId]/drafts/new`
server action and a new bearer-token-authenticated route,
`POST /api/mobile/message-drafts`. A matching
`POST /api/mobile/voice-captures/[id]/transcribe` wraps a new
`server/transcription/provider.ts` (mirrors `server/ai/message-provider.ts`'s
provider-selection pattern; returns `@noyala/domain`'s labelled demo
transcriber today, same as Stage 3's demo message generator before a real
AI key existed) and inserts `extracted_memory_candidates` via
`extractFactCandidates`. A third route, `POST /api/mobile/account/delete`,
mirrors `server/account/actions.ts`'s admin-API deletion — mobile has no
cookie session for the existing server action to read.
`apps/web/src/server/supabase/bearer-client.ts` is the shared piece: an
RLS-scoped Supabase client built from a request's `Authorization: Bearer
<token>` header instead of a cookie jar, used by all three routes.

### New: a storage bucket for voice recordings
No `storage.buckets`/`storage.objects` policy existed anywhere in this
repo before now — voice capture was schema-and-domain-only until this
round. Added `supabase/migrations/20260906000200_voice_captures_storage_bucket.sql`:
a private `voice-captures` bucket with RLS scoped to
`{user_id}/...` object paths, the same per-owner scoping every table
policy in this schema already uses. **Not yet applied to the live
project** — this environment has no `supabase link`/service-role access
for schema changes (the same known blocker `docs/roadmap.md` already
documents for every migration in this repo); whoever has that access next
should run `supabase db push` before voice capture can actually upload
anything against the real project.

### A real bug this round's own tooling setup found
`apps/mobile/metro.config.js`'s first draft followed Expo's monorepo guide
literally, including `resolver.disableHierarchicalLookup = true`. That
guide is written for yarn/npm workspaces, which hoist most transitive
dependencies to a shared top-level `node_modules`. pnpm deliberately
doesn't — `expo-modules-core` (a dependency of `expo` itself) only exists
inside `expo`'s own nested `node_modules/.pnpm/expo@.../node_modules/`,
reachable only via Metro's normal upward directory search. Disabling that
search broke resolution for anything pnpm hadn't hoisted, surfacing as
`Unable to resolve module expo-modules-core` the first time the bundle was
actually requested — caught by loading the app in a real browser, not by
`tsc` (which doesn't run Metro's resolver at all) or by reading the config
back. Fixed by removing that one line; `unstable_enableSymlinks` (which
pnpm does need) stayed.

## Verified, with evidence

- **`pnpm -r typecheck`** — clean across all four packages
  (`@noyala/brand`, `@noyala/domain`, `@noyala/web`, `@noyala/mobile`).
- **`pnpm -r test`** — 138/138 in `@noyala/domain`, 54/54 in `@noyala/web`,
  all pre-existing tests, none touched by this round's refactor of
  `messages/actions.ts` broke.
- **`pnpm --filter @noyala/web lint`** and **`build`** — clean (one
  pre-existing, unrelated warning); build output lists all three new
  `/api/mobile/*` routes compiling successfully.
- **The app actually runs**: `expo start --web`, loaded in headless
  Chromium via Playwright, wired to the real Supabase project
  (`gzldzzianiwoivszkopk`) using its public URL/anon key. Confirmed live,
  with zero console/page errors in every case:
  - Unconfigured state (no `EXPO_PUBLIC_SUPABASE_*` set): renders the
    honest "Sign-in isn't configured yet" screen rather than crashing —
    same degrade-lenient posture as `apps/web`'s `/api/health`.
  - Configured against the real project: Welcome screen renders per the
    design (wordmark, tagline, copy); tapping "Get started" navigates to
    the email step of sign-in; the "Send code" button is correctly
    disabled until the typed text contains "@".

## Known limitations — deliberately not silently skipped

- **No real device/simulator exists here**, so nothing native-only was
  exercised: the actual microphone/contacts OS permission prompts, the
  native contact picker's real return shape, `wa.me`/`sms:`/`mailto:`
  handoffs actually opening another app, and push notification permission
  UI are all implemented against their documented Expo APIs but unverified
  on-device — the same category of gap `docs/roadmap.md` already tracks
  for the web app's device-contact picker and send-handoff links.
- **The sign-in code itself was never completed live.** Completing OTP
  sign-in needs a real inbox to read the 6-digit code from; this
  environment has none. Every screen behind sign-in (Home, People, Person,
  Calendar, Message Studio, Voice capture, Gifts, Circles, Settings, …) is
  implemented and typechecks against the real data layer, but has not been
  clicked through against live authenticated data the way the unconfigured
  and pre-auth screens above were.
- **expo-contacts' native picker returns one contact per call**, not a
  batch the way the design's mock (and the W3C Contact Picker API
  `apps/web` uses) implies — `apps/mobile/src/lib/contacts.ts` calls it in
  a loop instead ("Open the picker" once per person). A real trade-off
  against the actual native API, not an oversight.
- **`expo-contacts`' `Birthday.month` is treated as 0-indexed** (converted
  to this schema's 1-12 in `toBirthday`) based on the library's documented
  behaviour — not confirmed against a real contact on a real device.
- **Native push is permission-only.** `PermissionsScreen` requests the OS
  notification permission for real; it does not register a device push
  token anywhere. `push_subscriptions` is shaped for Web Push
  (endpoint/keys), not a native Expo push token — wiring that is a
  well-scoped follow-up now that `apps/mobile` exists, matching
  `docs/roadmap.md`'s existing "Native-push adapter" note.
- **The "Noyala Quiet" plan screen has no billing system to switch to.**
  Stage 8 was deliberately skipped (see `docs/roadmap.md`); this screen
  says so plainly instead of rendering a fake "Upgrade" button.
- **Account deletion has no 30-day grace period**, matching
  `apps/web/src/components/DeleteAccountForm.tsx`'s actual behaviour
  (immediate, via the admin API) — the design mock's "everything goes in
  thirty days" copy describes a state this schema doesn't have, so this
  app's copy says "immediate and permanent" instead.
- **Data export isn't available from the phone.** `apps/web`'s
  `/api/export/*` routes read a cookie-based session; a mobile-facing
  equivalent wasn't built this round. Settings links to the web app for
  this instead of pretending to support it.
- **The voice-captures storage migration is unapplied** to the live
  project — see above.

## What's next

Once someone with `supabase link`/service-role access applies the new
storage migration, and once a real device or simulator is available: run
the actual on-device journeys (voice record → upload → transcribe →
review; contacts import; message handoff) end-to-end, register a real
device push token, and replace the demo transcription/message providers
with real ones. None of that requires re-architecting anything above —
every seam (`TranscriptionProvider`, `AIMessageProvider`, the bearer-token
mobile API routes) was already built to take a real implementation as a
drop-in.
