# 1. Record architecture decisions

Date: 2026-09-04

## Status

Accepted

## Context

The Master Build Prompt requires recording "consequential decisions" as
concise architecture decision records so later stages (and future
contributors) understand why, not just what.

## Decision

Use lightweight ADRs in `docs/decisions/`, numbered sequentially, one
decision per file, following this same four-section format
(Status / Context / Decision / Consequences).

## Consequences

Every stage report that makes a consequential, hard-to-reverse choice
(stack, schema shape, provider choice, security tradeoff) must add an ADR
here rather than only mentioning it in the stage report prose.
