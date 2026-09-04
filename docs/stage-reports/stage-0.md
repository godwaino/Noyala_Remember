# Stage 0 — Discovery, brand foundation and implementation baseline

## Delivered scope

- Repository audit: the repository contained only
  `Noyala-Full-Product-Architecture-and-Master-Build-Prompt.md` — no prior
  code, conventions or tests to preserve.
- Product terminology and permanent guardrails captured in
  `docs/product.md`.
- Boundaries, trust boundaries, provider-adapter pattern and initial threat
  model captured in `docs/architecture.md`.
- Staged roadmap with evidence-based status in `docs/roadmap.md`.
- Two architecture decision records in `docs/decisions/` (ADR process
  itself, and the stack/monorepo-layout choice).
- `.env.example` with every environment variable the app can use,
  documented, no real values.
- pnpm workspace skeleton (`package.json`, `pnpm-workspace.yaml`,
  `tsconfig.base.json`) and `@noyala/brand` (name, tagline, metadata,
  design tokens, primary nav) as the single source of product identity.

## Evidence

- `packages/brand` type-checks cleanly (verified in Stage 1's validation
  pass, since Stage 0 alone has no build target).

## Exit gate

- Existing behaviour preserved: there was none to preserve.
- Architecture and product documents agree with each other and with the
  Master Build Prompt.
- Noyala's name/tagline/positioning are centralised in `@noyala/brand`
  rather than duplicated.

## Deferred to later stages

Everything else — see `docs/roadmap.md`.
