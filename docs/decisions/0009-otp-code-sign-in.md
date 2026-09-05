# 9. Switch primary sign-in from a clicked link to a typed 6-digit code

Date: 2026-09-05

## Status

Accepted

## Context

`docs/decisions/0007-magic-link-error-surfacing.md` fixed this app's own
bug (swallowed errors, no feedback on `/login`) but didn't fix the
underlying cause it diagnosed: an email client's link-scanner (Microsoft
Safe Links, most likely, given the Outlook/Hotmail address involved)
prefetching the magic link and consuming its single-use token before the
real user's click. After that fix shipped, the same user reported the
identical symptom again — confirming the root cause is the link itself,
not this app's error handling.

Supabase's own docs name this exact failure mode ("Email prefetching") and
give the fix: stop sending a clickable link at all, and send a 6-digit
`{{ .Token }}` the user types in manually instead. A typed code can't be
consumed by an automated scanner the way a `GET`-able link can.

Separately, the project has since been configured with a custom SMTP
provider (Brevo) for auth emails. This fixes *deliverability* — Supabase's
default mailer is heavily rate-limited — but does **not** fix the
link-prefetching problem, which is about what a corporate/webmail client
does with a link in the email body, independent of who sent it.

## Decision

- `/login` now asks for an email, then a 6-digit code, instead of sending
  a clickable link. `requestLoginCode` (`apps/web/src/app/login/actions.ts`)
  still calls `supabase.auth.signInWithOtp({ email })` — the same call as
  before; `verifyLoginCode` calls `supabase.auth.verifyOtp({ email, token,
  type: "email" })` to establish the session once the user types the code.
- **This requires a one-time change in the Supabase dashboard that this
  environment has no tool to make**: Authentication → Email Templates →
  Magic Link must be edited to show `{{ .Token }}` as plain text and must
  **not** contain a clickable `{{ .ConfirmationURL }}` link — if the link
  is still present, a scanner can still prefetch it and invalidate the
  same underlying one-time secret the code represents, defeating the whole
  point. Suggested replacement body:
  ```html
  <h2>Your sign-in code</h2>
  <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
  <p>This code expires shortly and can only be used once.</p>
  ```
- `/auth/callback` (the PKCE code-exchange route) is left in place as a
  fallback rather than deleted — harmless if the template is ever reverted
  to include a link, and it's what `docs/decisions/0007` already hardened.
  `requestLoginCode` no longer passes `emailRedirectTo`, so nothing in the
  app currently drives traffic to it.

## Consequences

- Once the dashboard template change is made, the link-prefetching failure
  mode is structurally impossible — there's no link for anything to
  prefetch.
- Until that dashboard change is made, the emailed template may still
  contain the old link-based content and this won't be visibly fixed for
  the user — this is called out explicitly in `docs/roadmap.md`'s known
  blockers as the one manual step needed to close this out.
- Every future email-based sign-in flow (invites, if ever added) should
  default to the same code-entry pattern rather than a clickable link,
  given this confirmed real-world failure mode.
