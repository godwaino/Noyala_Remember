import "server-only";
import {
  ageAtOccurrence,
  bucketForDaysUntil,
  calendarDateInTimeZone,
  daysBetween,
  nextOccurrence,
  type CalendarDate,
  type UpcomingBucket,
} from "@noyala/domain";
import type { ImportantDateWithPerson } from "./queries";

export interface ResolvedUpcomingDate extends ImportantDateWithPerson {
  occurrence: CalendarDate;
  daysUntil: number;
  bucket: UpcomingBucket;
  age: number | null;
}

/**
 * Each date carries its own IANA timezone (set when it was created), so
 * "today" is computed per-date rather than once for the whole list —
 * correct even for a user with dates recorded in different timezones.
 */
export function resolveUpcomingDates(
  items: ImportantDateWithPerson[],
  now: Date,
): ResolvedUpcomingDate[] {
  const resolved: ResolvedUpcomingDate[] = [];

  for (const item of items) {
    const today = calendarDateInTimeZone(now, item.date.timezone);
    const occurrence = nextOccurrence(
      {
        month: item.date.month,
        day: item.date.day,
        year: item.date.year,
        recursAnnually: item.date.recursAnnually,
      },
      today,
    );
    if (!occurrence) continue;

    const daysUntil = daysBetween(today, occurrence);
    resolved.push({
      ...item,
      occurrence,
      daysUntil,
      bucket: bucketForDaysUntil(daysUntil),
      age: ageAtOccurrence(item.date.year, occurrence),
    });
  }

  return resolved.sort((a, b) => a.daysUntil - b.daysUntil);
}
