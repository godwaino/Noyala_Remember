/**
 * Deterministic, timezone-aware date-recurrence logic. Framework-free and
 * clock-free: every function that cares "what is today" takes it as an
 * explicit parameter so callers (and tests) control the clock — never
 * `new Date()` inside this module.
 *
 * Everything here works in whole calendar days in a specific IANA
 * timezone, never in instants/hours, which is what makes it immune to
 * daylight-saving shifts: "tomorrow" is always exactly one calendar day
 * away regardless of whether a DST transition happens between now and
 * then.
 */

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/**
 * Leap-day policy for a 29 February date in a non-leap occurrence year:
 * observed on 28 February. This is a product decision (documented in
 * docs/decisions/), not a Postgres/JS quirk — another reasonable app could
 * choose 1 March instead.
 */
export function resolveObservedDate(month: number, day: number, occurrenceYear: number): CalendarDate {
  if (month === 2 && day === 29 && !isLeapYear(occurrenceYear)) {
    return { year: occurrenceYear, month: 2, day: 28 };
  }
  return { year: occurrenceYear, month, day };
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Extracts the current calendar date in a given IANA timezone from an instant. */
export function calendarDateInTimeZone(instant: Date, timeZone: string): CalendarDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function toUtcMidnight(date: CalendarDate): number {
  return Date.UTC(date.year, date.month - 1, date.day);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole calendar days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((toUtcMidnight(to) - toUtcMidnight(from)) / MS_PER_DAY);
}

function compareMonthDay(a: { month: number; day: number }, b: { month: number; day: number }): number {
  return a.month !== b.month ? a.month - b.month : a.day - b.day;
}

export interface RecurringDateInput {
  month: number;
  day: number;
  /** null means the year is deliberately unknown — never fabricate one. */
  year: number | null;
  recursAnnually: boolean;
}

/**
 * The next occurrence of a recurring (or one-off) date on or after `today`.
 * Returns null only for a non-recurring date whose single occurrence has
 * already passed.
 */
export function nextOccurrence(input: RecurringDateInput, today: CalendarDate): CalendarDate | null {
  if (!input.recursAnnually) {
    if (input.year === null) {
      throw new Error("A non-recurring date must have a known year");
    }
    const occurrence = { year: input.year, month: input.month, day: input.day };
    return daysBetween(today, occurrence) >= 0 ? occurrence : null;
  }

  const observedThisYear = resolveObservedDate(input.month, input.day, today.year);
  const occurrenceYear =
    compareMonthDay(observedThisYear, today) >= 0 ? today.year : today.year + 1;

  return resolveObservedDate(input.month, input.day, occurrenceYear);
}

/**
 * Age reached on the next occurrence. Never returns a number when the
 * birth/anniversary year is unknown — see docs/product.md.
 */
export function ageAtOccurrence(year: number | null, occurrence: CalendarDate): number | null {
  if (year === null) return null;
  return occurrence.year - year;
}

export type UpcomingBucket = "today" | "next7" | "next30" | "later";

export function bucketForDaysUntil(daysUntil: number): UpcomingBucket {
  if (daysUntil <= 0) return "today";
  if (daysUntil <= 7) return "next7";
  if (daysUntil <= 30) return "next30";
  return "later";
}

export interface UpcomingDate<T> {
  item: T;
  occurrence: CalendarDate;
  daysUntil: number;
  bucket: UpcomingBucket;
  age: number | null;
}

/**
 * Resolves and groups a list of dates relative to `today`, dropping any
 * whose sole (non-recurring) occurrence has already passed. Sorted
 * soonest-first within the returned array; group by `.bucket` at the call
 * site for the Today/Next 7/Next 30/Later UI.
 */
export function resolveUpcoming<T>(
  items: T[],
  getDate: (item: T) => RecurringDateInput,
  today: CalendarDate,
): UpcomingDate<T>[] {
  const resolved: UpcomingDate<T>[] = [];
  for (const item of items) {
    const dateInput = getDate(item);
    const occurrence = nextOccurrence(dateInput, today);
    if (!occurrence) continue;
    const daysUntil = daysBetween(today, occurrence);
    resolved.push({
      item,
      occurrence,
      daysUntil,
      bucket: bucketForDaysUntil(daysUntil),
      age: ageAtOccurrence(dateInput.year, occurrence),
    });
  }
  return resolved.sort((a, b) => a.daysUntil - b.daysUntil);
}

/**
 * True when `today` is exactly `offsetDays` before the next occurrence —
 * the reminder-window check the scheduled worker runs per user/date/offset
 * combination. Deliberately takes the already-resolved occurrence rather
 * than recomputing it, so a caller can also use it to build the
 * `reminderDeduplicationKey` (see outbox.ts) from the same value.
 */
export function isInReminderWindow(
  occurrence: CalendarDate,
  today: CalendarDate,
  offsetDays: number,
): boolean {
  return daysBetween(today, occurrence) === offsetDays;
}
