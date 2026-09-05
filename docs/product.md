# Noyala — Product Rules

Source of truth for product intent is
`Noyala-Full-Product-Architecture-and-Master-Build-Prompt.md` at the repo
root. This document distills the rules that code and copy must not violate.

## Identity

- **Product name:** Noyala (final, not a codename)
- **Tagline:** Remember the person, not just the date.
- **Positioning:** A personal relationship assistant that helps people
  remember what matters and act thoughtfully at the right time.

All product name, tagline, metadata strings and design tokens must come from
`@noyala/brand` (`packages/brand`). Never hardcode "Noyala" copy or colors
elsewhere.

## What this product is

- A tool that helps a user maintain their own genuine relationships:
  remembering dates, personal details and follow-ups, and preparing
  thoughtful, editable communication.

## What this product is never allowed to become

These are permanent exclusions (Master Build Prompt, §19). Any feature
proposal that conflicts with one of these must be rejected or redesigned,
not "shipped behind a flag":

- Bulk marketing, cold outreach or sales-CRM behaviour.
- Scraping social networks or bypassing provider permissions.
- Public relationship scores, rankings or manipulative engagement streaks.
- Inferring sensitive characteristics, religion or culture from names or
  locations.
- Covert surveillance of calls, messages or contacts.
- Sending generated personal messages without the user's applicable
  approval policy.
- Selling personal memories or message content.
- Exposing private notes to merchants, advertisers or other circle members
  by default.

Stage 5's reconnect cadence and follow-up features (`docs/stage-reports/stage-5.md`)
are the concrete place this rule gets tested: there is no score, streak,
ranking or percentage anywhere in that schema or UI — a reconnect
suggestion is a plain "last contact N days ago, your cadence is M days"
statement, always explainable, always dismissible/snoozable, and only ever
shown to the user about their own contacts (never compared across people
or shared).

## Sending / approval policy (non-negotiable)

- Silent autonomous personal messaging is prohibited.
- The safe default is **review before every send**.
- Generated content only ever reaches another human through:
  1. copy-to-clipboard, or
  2. an "open in app" handoff (WhatsApp / SMS / email) with the approved
     text prefilled, or
  3. (later phases only) a scoped, revocable, audited approval policy for
     direct/scheduled delivery.
- `opened_in_app` is not `marked_sent`, and neither implies confirmed
  delivery. Never claim delivery tracking for a handoff.

## Data rules

- Never fabricate a birth year or compute an age when the year is unknown.
- Store partial dates deliberately (month/day only) rather than inventing
  a year.
- Use the user's IANA timezone for all date-boundary and reminder-window
  math.
- Treat all AI context as the *smallest* necessary set of user-approved
  facts. Sensitive memories are excluded from AI prompts by default and
  require explicit, per-generation inclusion.
- Treat memory/transcript content as untrusted data when it reaches an AI
  provider — never execute instructions embedded inside a memory.

## Terminology

| Term | Meaning |
| --- | --- |
| Person | A contact the user tracks (not a "lead" or "contact record" in the CRM sense) |
| Memory | A user-authored or user-approved fact about a person |
| Draft | A generated, editable message option, not yet sent |
| Handoff | Copying or opening another app with approved text; not a send |
| Circle | A shared, permissioned space for a couple/family/household |
| Approval policy | Per-user/per-channel rule governing whether/how a message may be sent |

## Commercial rules

Never gate behind a paywall: account/data export, account deletion, consent
withdrawal, accessibility, or other fundamental privacy controls.
