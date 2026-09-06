# Disaster recovery

Master Build Prompt Stage 9 asks for a "backup/restore drill, disaster-recovery
runbook and retention jobs." This documents what was actually verified in
this environment, what genuinely couldn't be, and why — rather than
claiming a drill that didn't happen.

## What this environment could and couldn't verify

Two Supabase MCP tools exist that look like they'd let a "restore drill"
happen directly: `create_branch` and `restore_project`. Neither was used,
for concrete reasons:

- **`create_branch`** provisions a real, separately-billed database and
  explicitly does **not** copy production data onto it — its own
  description states "production data will not carry over," only
  migrations are replayed. It also requires cost confirmation before
  creating one (a real recurring charge on the account). Since a
  branch can't hold a copy of production data, it cannot exercise a
  *data* restore at all — only a schema-replay check, which is covered
  below without spending anything. Creating one wasn't worth a real
  charge for a drill it can't actually perform.
- **`restore_project`** operates on the live project directly — this
  project has a real signed-up user (see `docs/roadmap.md`'s "Known
  blockers"). Invoking a database-altering restore against production
  as a "drill," with no staging copy to test it on first, is exactly
  the kind of destructive, hard-to-reverse action that needs the
  account owner's explicit, deliberate authorization in the moment, not
  something to try casually while writing documentation.

**What was verified for free, live, without touching production data:**
schema reproducibility. Every migration in `supabase/migrations/` is
timestamped, applied in order, and `list_migrations` against the live
project confirms the applied set matches the local files exactly — this
has been true and re-checked at every stage since Stage 1. That means the
*schema* half of recovery (rebuild an empty database to the current
structure from source control alone) is continuously proven, not just
assumed.

**What remains genuinely unverified — a real, open risk, not a gap to
paper over:**

- **Whether this project's Supabase plan has automatic backups at all.**
  Supabase's Free tier has *no* automatic backups or point-in-time
  recovery; Pro and above get daily backups by default, with PITR as an
  add-on. This environment's tools don't expose the project's billing
  plan, so this is unconfirmed. **Action for the account owner:** check
  Supabase Dashboard → Project Settings → Add-ons / Backups. If the
  project is on Free (likely, given no billing setup appears anywhere
  else in this codebase's history), there is currently no way to recover
  from data loss beyond what's rebuilt from users re-entering data — this
  is a real production risk, not a documentation nit.
- **An actual full restore has never been executed or timed**, so RPO/RTO
  below are Supabase's platform-advertised figures, not measured ones —
  Stage 9's exit gate ("recovery objectives are measured rather than
  assumed") is not yet met and is called out as such rather than
  rounded up.

## Recovery point/time objectives (platform figures, not independently measured)

| Scenario | Recovery mechanism | RPO | RTO |
| --- | --- | --- | --- |
| Schema corruption/loss only | Reapply `supabase/migrations/*.sql` in order to a fresh database | 0 (schema is fully in source control) | Minutes (a few dozen small migrations) |
| Data loss, project on a paid plan with PITR | Supabase point-in-time restore | Depends on plan's PITR window | Supabase-managed; not measured here |
| Data loss, project on Free (no backups) | **None** — see above | Unbounded | Unbounded |

## What actually gets deleted, and when (retention)

Two tables had unbounded growth with no retention policy before this
stage — see `docs/decisions/0016-retention-purge-piggybacked-on-outbox-cron.md`:

- `outbox_jobs`: `succeeded`/`dead_letter` rows older than 30 days are
  purged. Nothing else reads a finished job again.
- `notification_deliveries`: `sent`/`failed`/`cancelled` rows older than
  365 days are purged — kept much longer since it backs the account's own
  delivery-history UI on `/settings`.
- Nothing else in the schema (`people`, `memories`, `message_history`,
  etc.) is ever purged automatically — those are the user's own data,
  kept until the user deletes it or their account (see
  `docs/data-protection.md`).

## Runbook: rebuilding schema from scratch

Genuinely exercised (this is exactly what every stage's `apply_migration`
calls have done, repeatedly, against this live project):

1. Provision a fresh Postgres/Supabase project.
2. Apply every file in `supabase/migrations/` in filename (timestamp)
   order — each one is idempotent-safe to re-run where it uses
   `if not exists`/`if exists` guards, and additive otherwise.
3. Confirm `docs/architecture.md`'s RLS conventions hold: run
   `get_advisors(type: "security")` and confirm no `rls_disabled` or
   unexpected `rls_enabled_no_policy` findings beyond `outbox_jobs`
   (intentional — service-role-only).
4. Point `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/
   `SUPABASE_SERVICE_ROLE_KEY` at the new project.

## Runbook: what to do if the account owner needs to restore real data

1. Confirm the project's actual plan and backup/PITR availability in the
   Supabase Dashboard (this is the step this environment could not do).
2. If backups exist: use the Dashboard's restore flow (or
   `mcp__Supabase__restore_project` from a session with explicit,
   in-the-moment authorization) — never as a "test," only as a real,
   deliberate recovery action, since it operates on production directly.
3. If no backups exist: there is no automated recovery path. This is the
   real risk item above — resolving it (upgrading plan, or building a
   scheduled `pg_dump`-based export to external storage) is a decision
   for the account owner, not something to build speculatively here
   without knowing which direction they'd rather take.
