# 7. Surface the real magic-link failure reason instead of a blank retry

Date: 2026-09-05

## Status

Accepted

## Context

A real user report: "the sign-in link from the email is taking me back to
sign in again." Supabase's own auth logs (`auth_logs`) showed the actual
cause: several `/verify` calls failing with `"One-time token not found"` /
`"Email link is invalid or has expired"`, interspersed with occasional
successful ones. Magic links are single-use; the most likely explanation
for a user's *own* click failing is that something else — most commonly an
email client's or corporate mail gateway's link-scanner pre-visiting URLs
in incoming mail to check for phishing — consumed the token first. This is
a known, common failure mode for GET-based magic links in general, not
specific to Noyala's implementation, and is especially common on
Outlook/Hotmail and corporate email.

`/auth/callback` previously caught every failure (a missing code, a failed
`exchangeCodeForSession`, an unexpected throw) into one bare
`?error=auth-callback-failed` redirect — and `/login` didn't even read
that param. The user-visible result was indistinguishable from "sign-in is
broken": a blank sign-in form with no explanation, every time.

## Decision

- `/auth/callback` passes through the *real* reason as `?error=`:
  Supabase's own `error`/`error_description` when `/verify` failed before
  ever reaching us with a code; the real `exchangeCodeForSession` error
  message otherwise; `missing_code` / `unexpected_error` only for the
  genuinely-unexpected cases.
- `/login` reads `?error=` and shows it in a plain-language banner with a
  clear next step ("request a new link"), rather than silently discarding
  it.
- We do **not** attempt to work around link-prefetching by disabling
  Supabase's single-use-token behavior (that would reopen a real replay
  vulnerability) or by switching to a numeric OTP-code flow — the latter
  would require customizing the Supabase project's email template to
  surface `{{ .Token }}` (this environment doesn't have a tool for that),
  and is tracked as a follow-up if the "request a new link" mitigation
  isn't enough in practice.

## Consequences

- A user hitting this now sees "That sign-in link isn't valid — it may
  have expired or already been used. Request a new one below." instead of
  a bare form, and can immediately retry instead of assuming the app is
  broken.
- If link-prefetching turns out to be the dominant cause in practice, the
  next step is a numeric-OTP fallback (`verifyOtp` with `type: "email"`)
  once the email template exposes the token — noted in `docs/roadmap.md`.
