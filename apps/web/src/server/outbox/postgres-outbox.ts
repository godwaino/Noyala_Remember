import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_MAX_ATTEMPTS,
  type EnqueueJobInput,
  type OutboxJob,
  type OutboxStore,
} from "@noyala/domain";

/**
 * Postgres-backed OutboxStore, talking to the `outbox_jobs` table (see
 * supabase/migrations/20260904000900_outbox_jobs.sql) through a
 * service-role client — this table has no RLS policies, so only the
 * service role can read/write it. Concurrency-safe claiming is done in the
 * database via `claim_outbox_job` (SELECT ... FOR UPDATE SKIP LOCKED),
 * verified against a live project — see docs/stage-reports/stage-1.md.
 *
 * `claim_outbox_job` also reclaims jobs a crashed worker left stuck in
 * "processing" (dead-lettering ones that have exhausted their attempts) —
 * see docs/decisions/0006-outbox-stale-processing-reclaim.md. The staleness
 * threshold has a SQL-side default, so this client doesn't need to pass one.
 */
export function createPostgresOutboxStore(client: SupabaseClient): OutboxStore {
  return {
    async enqueue<Payload>(input: EnqueueJobInput<Payload>): Promise<OutboxJob<Payload>> {
      const { error } = await client.from("outbox_jobs").upsert(
        {
          type: input.type,
          payload: input.payload as object,
          deduplication_key: input.deduplicationKey,
          available_at: (input.availableAt ?? new Date()).toISOString(),
          max_attempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
        },
        { onConflict: "deduplication_key", ignoreDuplicates: true },
      );

      if (error) {
        throw new Error(`Failed to enqueue outbox job: ${error.message}`);
      }

      const { data, error: fetchError } = await client
        .from("outbox_jobs")
        .select("*")
        .eq("deduplication_key", input.deduplicationKey)
        .single();

      if (fetchError || !data) {
        throw new Error(
          `Enqueued job but failed to read it back: ${fetchError?.message ?? "no row"}`,
        );
      }

      return toOutboxJob<Payload>(data);
    },

    async claimNext(jobType: string, now: Date = new Date()): Promise<OutboxJob | null> {
      const { data, error } = await client.rpc("claim_outbox_job", {
        job_type: jobType,
        claim_now: now.toISOString(),
      });

      if (error) {
        throw new Error(`Failed to claim outbox job: ${error.message}`);
      }

      const row = Array.isArray(data) ? data[0] : data;
      return row ? toOutboxJob(row) : null;
    },

    async markSucceeded(jobId: string): Promise<void> {
      const { error } = await client
        .from("outbox_jobs")
        .update({ status: "succeeded" })
        .eq("id", jobId);

      if (error) {
        throw new Error(`Failed to mark outbox job succeeded: ${error.message}`);
      }
    },

    async markFailed(jobId: string, errorMessage: string, retryDelayMs: number): Promise<void> {
      const { data: current, error: fetchError } = await client
        .from("outbox_jobs")
        .select("attempt_count, max_attempts")
        .eq("id", jobId)
        .single();

      if (fetchError || !current) {
        throw new Error(
          `Failed to load outbox job before marking failed: ${fetchError?.message ?? "no row"}`,
        );
      }

      const exhausted = current.attempt_count >= current.max_attempts;

      const { error } = await client
        .from("outbox_jobs")
        .update({
          status: exhausted ? "dead_letter" : "failed",
          last_error: errorMessage,
          available_at: exhausted
            ? undefined
            : new Date(Date.now() + retryDelayMs).toISOString(),
        })
        .eq("id", jobId);

      if (error) {
        throw new Error(`Failed to mark outbox job failed: ${error.message}`);
      }
    },
  };
}

interface OutboxJobRow {
  id: string;
  type: string;
  payload: unknown;
  deduplication_key: string;
  status: OutboxJob["status"];
  attempt_count: number;
  max_attempts: number;
  available_at: string;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

function toOutboxJob<Payload>(row: OutboxJobRow): OutboxJob<Payload> {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload as Payload,
    deduplicationKey: row.deduplication_key,
    status: row.status,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    availableAt: row.available_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
