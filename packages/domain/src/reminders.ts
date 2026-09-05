import {
  calendarDateInTimeZone,
  daysBetween,
  nextOccurrence,
  type RecurringDateInput,
} from "./dates";
import { reminderDeduplicationKey } from "./outbox";

export interface ReminderSourceDate extends RecurringDateInput {
  id: string;
  userId: string;
  timezone: string;
  reminderOffsets: number[];
}

export interface ReminderCandidate {
  importantDateId: string;
  userId: string;
  offsetDays: number;
  occurrenceYear: number;
  deduplicationKey: string;
}

/**
 * Finds every (date, offset) pair whose reminder window is exactly "now",
 * per the date's own timezone. Deliberately an exact-match check
 * (`daysBetween === offsetDays`) rather than "offsetDays or later" —
 * that's what makes the downtime catch-up rule in
 * docs/state-transitions.md ("clamp to the 0-day-offset case rather than
 * back-filling multiple missed offsets") fall out for free: `nextOccurrence`
 * never returns a date in the past, so if a run is skipped, the next run
 * simply finds no match for an offset whose window already passed, and
 * still fires correctly the moment `daysBetween` reaches a later
 * configured offset (down to 0, the occurrence day itself).
 *
 * Framework-free and clock-free — `now` is a required parameter, never
 * read internally, so this is fully deterministic and unit-testable.
 */
export function discoverReminders(
  dates: ReminderSourceDate[],
  now: Date,
): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];

  for (const date of dates) {
    const today = calendarDateInTimeZone(now, date.timezone);
    const occurrence = nextOccurrence(date, today);
    if (!occurrence) continue;

    const daysUntil = daysBetween(today, occurrence);

    for (const offsetDays of date.reminderOffsets) {
      if (daysUntil !== offsetDays) continue;

      candidates.push({
        importantDateId: date.id,
        userId: date.userId,
        offsetDays,
        occurrenceYear: occurrence.year,
        deduplicationKey: reminderDeduplicationKey({
          importantDateId: date.id,
          reminderOffsetDays: offsetDays,
          occurrenceYear: occurrence.year,
        }),
      });
    }
  }

  return candidates;
}
