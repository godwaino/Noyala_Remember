/**
 * Reconnect-cadence and follow-up logic for Stage 5 ("Relationship care").
 * Deliberately plain day-counts and buckets — no score, streak or ranking
 * anywhere here, per Master Build Prompt §4's explicit "without gamifying
 * relationships" / "without penalty scores or shame-inducing streaks."
 *
 * Day-counting here uses plain elapsed time (not the timezone-aware
 * calendar-day arithmetic in dates.ts) — "haven't connected in 30 days"
 * doesn't need per-person timezone precision the way an exact birthday
 * date does.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysSince(from: Date, now: Date): number {
  return Math.floor((now.getTime() - from.getTime()) / MS_PER_DAY);
}

export interface ReconnectStatusInput {
  cadenceDays: number | null;
  lastInteractionAt: Date | null;
  snoozedUntil: Date | null;
}

export interface ReconnectStatus {
  due: boolean;
  /** Null when there's no cadence set, or no interaction has ever been
   * logged (nothing to count from). */
  daysSinceLastInteraction: number | null;
}

/**
 * A person is due to reconnect when a cadence is set, they aren't
 * currently snoozed, and either nothing has ever been logged for them or
 * enough days have passed since the last one. No cadence set means never
 * due — reconnect suggestions are opt-in per person.
 */
export function getReconnectStatus(input: ReconnectStatusInput, now: Date): ReconnectStatus {
  const daysSinceLastInteraction = input.lastInteractionAt
    ? daysSince(input.lastInteractionAt, now)
    : null;

  if (input.cadenceDays === null) {
    return { due: false, daysSinceLastInteraction };
  }
  if (input.snoozedUntil && now.getTime() < input.snoozedUntil.getTime()) {
    return { due: false, daysSinceLastInteraction };
  }
  if (daysSinceLastInteraction === null) {
    return { due: true, daysSinceLastInteraction: null };
  }
  return { due: daysSinceLastInteraction >= input.cadenceDays, daysSinceLastInteraction };
}

export type FollowUpBucket = "overdue" | "due_soon" | "later" | "no_date";

/** "Soon" is deliberately a fixed, generous window (not a per-user setting)
 * — a technical default, not a validated product number. */
const DUE_SOON_WINDOW_DAYS = 3;

export function bucketFollowUp(dueAt: Date | null, now: Date): FollowUpBucket {
  if (!dueAt) return "no_date";
  if (dueAt.getTime() < now.getTime()) return "overdue";
  if (daysSince(now, dueAt) <= DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "later";
}

const BUCKET_ORDER: Record<FollowUpBucket, number> = {
  overdue: 0,
  due_soon: 1,
  later: 2,
  no_date: 3,
};

/** Overdue first (earliest due first), then due-soon, then later, then
 * undated last. Stable within a bucket by due date. */
export function sortFollowUpsForDisplay<T extends { dueAt: Date | null }>(
  items: T[],
  now: Date,
): T[] {
  return [...items].sort((a, b) => {
    const bucketDiff = BUCKET_ORDER[bucketFollowUp(a.dueAt, now)] - BUCKET_ORDER[bucketFollowUp(b.dueAt, now)];
    if (bucketDiff !== 0) return bucketDiff;
    if (a.dueAt && b.dueAt) return a.dueAt.getTime() - b.dueAt.getTime();
    return 0;
  });
}
