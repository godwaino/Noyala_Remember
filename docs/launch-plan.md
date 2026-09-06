# Launch plan

Master Build Prompt Stage 9 asks for "app-store/web launch assets, support
documentation and staged rollout plan." Covered here for what actually
applies to the product as it stands (web-only; no native app yet).

## App-store assets: not applicable yet

There is no native mobile app (Stage 7's `apps/mobile` was deliberately
not started — see `docs/roadmap.md`). App-store listing assets (icons,
screenshots, store descriptions, privacy-label disclosures) depend on a
built, runnable native client to screenshot and describe accurately —
producing them now would be describing a product that doesn't exist yet.
This is a Stage 7 follow-on item, not a Stage 9 gap.

## Web launch assets

- **Brand identity**: `packages/brand` is the single source of truth for
  name/tagline/color tokens, already used consistently across the app
  (confirmed during this stage's accessibility pass — one token change
  fixed contrast app-wide because nothing hardcodes brand colors outside
  it).
- **Metadata**: `apps/web/src/app/layout.tsx`'s exported `metadata` uses
  `@noyala/brand`'s `metadata` object — page titles and description are
  already correct for link previews/SEO.
- **Missing**: no Open Graph/social preview image, no favicon beyond
  Next.js's default. Both are small, concrete follow-ups whenever launch
  copy/design is finalized — not built speculatively here since neither
  has real content to render yet (an OG image needs actual marketing
  copy/design, which is a product decision, not a code one).

## Support documentation

- **For users**: none exists yet — no help center, no FAQ, no in-app
  support contact. At current scale (one real user, per
  `docs/roadmap.md`), this hasn't been a blocker, but it's a real gap for
  a wider launch. A minimal version (a `/help` page linking to a support
  email) is a small, well-scoped addition whenever more users are
  expected.
- **For whoever operates this app** (the account owner, not a support
  team): this is what `docs/` already is — `docs/architecture.md`,
  `docs/permissions.md`, `docs/state-transitions.md`,
  `docs/data-protection.md`, `docs/disaster-recovery.md`, and this file
  are the operational documentation. `docs/roadmap.md`'s "Known blockers"
  section is the single most important one to read before any deploy —
  it lists every environment variable that must be set for the app to
  actually work (reminders, push, AI) versus fall back to a safe demo/log
  mode.

## Staged rollout plan

Given the product's actual current state — a single real user, one
Supabase project, no staging environment, no support team — a
traditional multi-region/percentage-based staged rollout doesn't apply
yet. What does apply, and is recommended before inviting meaningfully more
users:

1. **Resolve the Stage 9 production-readiness blockers first** (see
   `docs/production-readiness.md`) — backup/PITR status, in particular,
   since it gets more consequential the more user data accumulates before
   it's resolved.
2. **Set the missing environment variables** (`CRON_SECRET`, VAPID keys,
   optionally `AI_PROVIDER_API_KEY`, `ERROR_MONITORING_DSN`) — several
   real features (reminders, push, error visibility) are silently in a
   safe-fallback mode without them, which is fine for one user manually
   checked on, not fine for onboarding others who'd have no way to notice
   or report that reminders never actually arrived.
3. **Invite a small next batch of real users (single digits) before a
   public launch** — this is a good-sized cohort to actually exercise the
   magic-link/OTP sign-in flow (only tested against one real inbox so
   far), the reminder pipeline end-to-end with real email/push, and the
   circles/sharing flows with genuinely different people, none of which
   this environment can fully verify without real accounts.
4. **Public launch** only after step 3 surfaces no new blockers, and only
   once app-store assets exist if a native launch is bundled with it —
   otherwise the web app can launch independently of Stage 7.

This is a plan for *when* to widen access, not a mechanism (e.g. feature
flags, percentage rollout) — none of that infrastructure exists yet, and
building it now, before there's a cohort to roll out to, would be exactly
the speculative-scope this project's conventions avoid. If a phased
technical rollout mechanism is wanted later, that's a Stage 8-adjacent
decision (feature rollout is explicitly in Stage 8's deliverable list).
