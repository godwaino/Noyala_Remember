# 2. Stack and monorepo layout

Date: 2026-09-04

## Status

Accepted

## Context

The repository was empty except for the Master Build Prompt itself, so
there was no existing convention to preserve (Master Build Prompt §2). The
prompt prescribes a specific stack: Next.js App Router + TypeScript,
Tailwind, Supabase (Postgres + Auth + RLS), a workspace monorepo, and a
later Expo/React Native mobile app reusing shared domain contracts.

## Decision

- Package manager / workspaces: **pnpm** (fast, disk-efficient, first-class
  workspace support, no license/registry concerns).
- Monorepo layout: `apps/*` for deployable applications, `packages/*` for
  shared, framework-agnostic code, `supabase/migrations` for schema — see
  `docs/architecture.md`.
- `packages/domain` is kept framework-free (no React, no Next.js, no
  Supabase client) specifically so it can be imported unchanged by the
  Stage 7 Expo app and by background workers.
- Testing: **Vitest** for unit tests in packages/apps (fast, native ESM/TS
  support, Jest-compatible API), Playwright deferred to when there is a
  real UI flow worth an end-to-end test (Stage 2+).

## Consequences

- Contributors need pnpm installed locally (documented in README).
- Adding `apps/mobile` later is additive; it does not require moving
  `packages/domain` or changing its public API, only adding a consumer.
- Service-role Supabase credentials must never be imported into any file
  reachable from `packages/domain` or from client-rendered React —
  enforced by keeping such clients under `apps/web/src/server/`.
