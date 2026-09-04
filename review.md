**The document is well aligned with a full-scale relationship assistant, and the overall architecture is sound.** It goes well beyond a birthday reminder app while preserving a clear promise: *“Remember the person, not just the date.”*

However, **I would strengthen several architectural contracts before using it as the definitive build instruction.** Its main weakness is that some ambitious requirements are described clearly at the product level but leave consequential implementation decisions to the coding agent.

### What is already strong

* **Modular monolith with phased delivery:** a sensible foundation for the complete product, without requiring a rewrite between stages.
* **User control over communication:** approval, cancellation and accurate handoff states are thoughtfully covered.
* **Privacy-conscious AI:** selected context, sensitive-memory exclusion and reviewed voice extraction are good foundations.
* **Operational detail:** outbox, retries, billing reconciliation, support restrictions and stage evidence are stronger than typical build prompts.
* **Product philosophy:** avoiding relationship scores, guilt and manipulative streaks gives the product a coherent identity.

**Keep these principles. Elevation should come mainly from precision and a more distinctive everyday experience, rather than adding more modules.**

### What needs tightening before building

| Area                       | Gap or inconsistency                                                                                                                                        | Recommended improvement                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ownership and circles**  | “Users can access only their own records” conflicts with shared-circle access.                                                                              | Define an explicit permission matrix for owned, shared and collaborative records. Separate permission to view from permission to edit, share, export and use in AI.                                  |
| **Field-level privacy**    | Sharing selected fields is required, but its database implementation is unspecified.                                                                        | Define how private fields are separated or exposed through restricted interfaces. RLS governs rows; it does not by itself implement the requested field-level sharing.                               |
| **Cross-record isolation** | A child record could carry the current user’s `user_id` while referencing another user’s `person_id` unless explicitly prevented.                           | Require ownership-consistent foreign keys or equivalent database-enforced checks, with malicious-reference tests.                                                                                    |
| **Dates and occasions**    | Birthdays are covered well, but the wider promise includes religious and cultural occasions that cannot all be represented as fixed annual month/day dates. | Distinguish partial birthdays, fixed annual dates, one-off events and calendar-dependent occasions. Specify supported recurrence types and authoritative occurrence sources where needed.            |
| **Reminder semantics**     | “Avoid duplicate delivery” is stated without defining what happens when a provider accepts a request and the worker crashes before recording success.       | Define provider idempotency, uncertain delivery states, reconciliation and retry policy. Also specify catch-up behaviour after downtime and changes to dates or timezones.                           |
| **Message approval**       | Some passages require reviewing every message; others permit channel/category policies.                                                                     | State whether approval always binds to exact content and recipient. My recommendation: approve the final message once, schedule it, and require fresh approval if content or destination changes.    |
| **Deletion and snapshots** | Immutable draft context can retain a memory after the original memory is deleted.                                                                           | Define deletion across drafts, snapshots, transcripts, search indexes, exports and queued work. “Immutable” should mean uneditable during normal use, with documented deletion/redaction exceptions. |
| **Surprise gifts**         | The system must hide gifts from recipients, but the relationship between a `person` and an authenticated circle member is undefined.                        | Define recipient identity mapping and participant-only gift permissions. Cover notification previews, search results and exports as well as screens.                                                 |
| **Offline privacy**        | Offline capture and “immediate revocation” are both promised.                                                                                               | Distinguish immediate server-access revocation from previously downloaded data. Define cache expiry, account-switch cleanup and restrictions on caching shared or sensitive content.                 |

### How I would elevate the actual product

**1. Make Home a small, useful action list.**

The proposed dashboard has several overlapping date groups and reminders. Give it a clearer purpose:

* **Today:** occasions and commitments needing attention.
* **Prepare:** upcoming occasions requiring a message, gift or coordination.
* **Reconnect:** a few optional suggestions with a clear explanation.

Let users act directly: draft, snooze, add a note or mark complete. Keep the calendar as the comprehensive view.

**2. Make memories trustworthy over time.**

A saved fact can become outdated. Add:

* source and last-confirmed date;
* current, uncertain or outdated status;
* correction and supersession;
* permission to use it in AI.

For example, “Daniel is starting university” should not keep appearing unchanged several years later. This would materially improve personalisation.

**3. Give users an explicit “sounds like me” setup.**

The document mentions voice preferences, but does not define them. Include message length, formality, humour, emoji use, preferred greetings and phrases to avoid. Allow users to voluntarily supply examples.

Distinguish **the user’s writing style** from **facts about the recipient** so personalisation does not require unnecessarily broad memory access.

**4. Add thoughtful pause controls.**

Support pausing a person, occasion or reconnect suggestion, including an optional indefinite pause. Users should be able to handle bereavement, separation or difficult relationships without deleting their history or explaining why.

**5. Simplify mobile navigation.**

Seven primary destinations are crowded. I would use **Home, People, Calendar and More**, with Drafts accessible from Home and Gifts/Circles under More. Contextual shortcuts can keep frequent actions close.

### How to strengthen the build instructions

**Move foundational requirements earlier.** Accessibility, localisation structure, retention rules, quota hooks and recovery planning should start in Stage 1. Stage 9 should validate and harden them.

Add four explicit deliverables:

1. **Permission matrix:** who can perform each action on each resource.
2. **State-transition definitions:** reminders, approvals, scheduled messages, imports and deletion.
3. **Measurable acceptance budgets:** expected load, reminder lateness, response times, recovery objectives and AI spend limits.
4. **Integration capability matrix:** each provider’s supported operations, setup dependencies and verification status.

Also distinguish **implemented**, **tested locally**, **verified against the provider**, and **production-enabled**. The prompt already prohibits fake success; these statuses make that requirement enforceable.

Finally, consolidate the repeated architecture, capability and stage descriptions around one canonical set of requirements. The repetition has already produced small inconsistencies, such as the date representation and sharing rules.

**My recommendation: retain the product scope and staged architecture, but resolve permissions, recurrence, delivery, approval and deletion contracts first. Those changes would make this a much stronger build specification and reduce expensive rework later.**
