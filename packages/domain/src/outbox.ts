/**
 * Provider-independent transactional outbox / durable worker contract.
 *
 * Any slow or failure-prone unit of work (sending a reminder, importing
 * contacts, calling the AI provider) is enqueued as an OutboxJob instead of
 * being done inline in a request handler. A concrete queue (Stage 1 ships a
 * Postgres-backed one in apps/web/src/server/outbox) implements
 * `OutboxStore` against this interface so the domain layer and its tests
 * never depend on Postgres directly.
 */

export type OutboxJobStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "dead_letter";

export interface OutboxJob<Payload = unknown> {
  id: string;
  /** Logical job type, e.g. "reminder.deliver" or "contacts.import". */
  type: string;
  payload: Payload;
  /**
   * Deterministic key that makes re-enqueuing or re-processing the same
   * logical unit of work a no-op. Required — see
   * docs/architecture.md threat model ("duplicate notification delivery").
   */
  deduplicationKey: string;
  status: OutboxJobStatus;
  attemptCount: number;
  maxAttempts: number;
  availableAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueJobInput<Payload = unknown> {
  type: string;
  payload: Payload;
  deduplicationKey: string;
  /** Delay before the job becomes claimable. Defaults to immediate. */
  availableAt?: Date;
  maxAttempts?: number;
}

/**
 * Storage contract a worker runs against. Implementations must guarantee:
 *   - `enqueue` is idempotent on `deduplicationKey` (a second enqueue with
 *     the same key does not create a second job).
 *   - `claim` is safe under concurrent workers (no two workers claim the
 *     same job).
 */
export interface OutboxStore {
  enqueue<Payload>(input: EnqueueJobInput<Payload>): Promise<OutboxJob<Payload>>;
  claimNext(jobType: string, now?: Date): Promise<OutboxJob | null>;
  markSucceeded(jobId: string): Promise<void>;
  markFailed(jobId: string, error: string, retryDelayMs: number): Promise<void>;
}

export const DEFAULT_MAX_ATTEMPTS = 5;

/** Exponential backoff with a cap, used by the default retry policy. */
export function computeRetryDelayMs(attemptCount: number): number {
  const baseMs = 1_000;
  const capMs = 15 * 60 * 1_000;
  return Math.min(capMs, baseMs * 2 ** attemptCount);
}

/**
 * Deterministic dedup key for a reminder delivery: same person + date +
 * offset + calendar day can only ever produce one delivery record, even if
 * the scheduler runs twice.
 */
export function reminderDeduplicationKey(input: {
  importantDateId: string;
  reminderOffsetDays: number;
  occurrenceYear: number;
}): string {
  return `reminder:${input.importantDateId}:${input.occurrenceYear}:${input.reminderOffsetDays}`;
}
