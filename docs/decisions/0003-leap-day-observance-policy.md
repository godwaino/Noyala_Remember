# 3. 29 February dates are observed on 28 February in non-leap years

Date: 2026-09-04

## Status

Accepted

## Context

Master Build Prompt §5 requires centralised recurring-date calculations and
explicit test coverage for "leap-day birthdays". A 29 February birthday or
anniversary needs *some* deterministic observed date in the three years out
of four that aren't leap years, for reminder scheduling, the Calendar
view, and age calculation. Two conventions are common in consumer
products: observe on 28 February, or observe on 1 March.

## Decision

Observe on **28 February** in a non-leap year
(`packages/domain/src/dates.ts`, `resolveObservedDate`). The real 29
February date is used whenever the occurrence year actually is a leap
year.

## Consequences

- This is a product choice, not a mathematical necessity — a future
  per-user preference (28 Feb vs. 1 Mar) could be added without changing
  the function's shape, only its rule.
- `reminderDeduplicationKey` (packages/domain/src/outbox.ts) is keyed by
  occurrence year, so a leap-day date reminded on 28 Feb in 2025 and on 29
  Feb in 2028 naturally gets two different, non-colliding delivery
  records.
