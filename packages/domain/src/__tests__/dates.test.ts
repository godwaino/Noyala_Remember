import { describe, expect, it } from "vitest";
import {
  ageAtOccurrence,
  bucketForDaysUntil,
  calendarDateInTimeZone,
  daysBetween,
  isInReminderWindow,
  isLeapYear,
  nextOccurrence,
  resolveObservedDate,
  resolveUpcoming,
  type CalendarDate,
} from "../dates";

const d = (year: number, month: number, day: number): CalendarDate => ({ year, month, day });

describe("isLeapYear", () => {
  it("handles the century rules correctly", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
  });
});

describe("resolveObservedDate (29 Feb policy)", () => {
  it("keeps 29 February in a leap year", () => {
    expect(resolveObservedDate(2, 29, 2024)).toEqual(d(2024, 2, 29));
  });

  it("observes 28 February in a non-leap year", () => {
    expect(resolveObservedDate(2, 29, 2025)).toEqual(d(2025, 2, 28));
  });

  it("leaves ordinary dates untouched", () => {
    expect(resolveObservedDate(6, 15, 2025)).toEqual(d(2025, 6, 15));
  });
});

describe("nextOccurrence — leap-day birthdays", () => {
  const leapBirthday = { month: 2, day: 29, year: 2000, recursAnnually: true };

  it("resolves to 28 Feb the same year when today is before it in a non-leap year", () => {
    expect(nextOccurrence(leapBirthday, d(2025, 1, 1))).toEqual(d(2025, 2, 28));
  });

  it("resolves to next year once this year's observed date has passed", () => {
    expect(nextOccurrence(leapBirthday, d(2025, 3, 1))).toEqual(d(2026, 2, 28));
  });

  it("resolves to the real 29 Feb in a leap year", () => {
    expect(nextOccurrence(leapBirthday, d(2024, 1, 1))).toEqual(d(2024, 2, 29));
  });

  it("is exactly on the observed date, not after it, when today matches", () => {
    expect(nextOccurrence(leapBirthday, d(2025, 2, 28))).toEqual(d(2025, 2, 28));
  });
});

describe("nextOccurrence — unknown birth year", () => {
  it("still computes a next occurrence and never fabricates a year for age", () => {
    const unknownYearBirthday = { month: 7, day: 4, year: null, recursAnnually: true };
    const occurrence = nextOccurrence(unknownYearBirthday, d(2026, 1, 1));
    expect(occurrence).toEqual(d(2026, 7, 4));
    expect(ageAtOccurrence(null, occurrence!)).toBeNull();
  });

  it("computes age correctly when the year is known", () => {
    const birthday = { month: 7, day: 4, year: 1990, recursAnnually: true };
    const occurrence = nextOccurrence(birthday, d(2026, 1, 1));
    expect(ageAtOccurrence(1990, occurrence!)).toBe(36);
  });
});

describe("nextOccurrence — year boundaries", () => {
  it("rolls over into next year when today is after the date this year", () => {
    const anniversary = { month: 1, day: 5, year: 2020, recursAnnually: true };
    expect(nextOccurrence(anniversary, d(2025, 12, 31))).toEqual(d(2026, 1, 5));
  });

  it("handles the date landing exactly on 31 December / 1 January", () => {
    const newYearsEve = { month: 12, day: 31, year: null, recursAnnually: true };
    expect(nextOccurrence(newYearsEve, d(2025, 12, 30))).toEqual(d(2025, 12, 31));
    expect(nextOccurrence(newYearsEve, d(2026, 1, 1))).toEqual(d(2026, 12, 31));
  });
});

describe("nextOccurrence — non-recurring custom dates", () => {
  it("returns the exact date when it's still ahead", () => {
    const oneOff = { month: 5, day: 1, year: 2026, recursAnnually: false };
    expect(nextOccurrence(oneOff, d(2026, 1, 1))).toEqual(d(2026, 5, 1));
  });

  it("returns null once a non-recurring date has passed", () => {
    const oneOff = { month: 5, day: 1, year: 2020, recursAnnually: false };
    expect(nextOccurrence(oneOff, d(2026, 1, 1))).toBeNull();
  });

  it("throws for an impossible non-recurring date with no year", () => {
    const invalid = { month: 5, day: 1, year: null, recursAnnually: false };
    expect(() => nextOccurrence(invalid, d(2026, 1, 1))).toThrow();
  });
});

describe("daysBetween", () => {
  it("counts across a leap-day boundary correctly", () => {
    expect(daysBetween(d(2024, 2, 28), d(2024, 3, 1))).toBe(2); // includes 29 Feb
    expect(daysBetween(d(2025, 2, 28), d(2025, 3, 1))).toBe(1); // no leap day
  });

  it("counts across a DST transition as ordinary calendar days", () => {
    // US spring-forward 2026: clocks jump 2am -> 3am on 8 March. Calendar-day
    // arithmetic must be unaffected by that local wall-clock discontinuity.
    expect(daysBetween(d(2026, 3, 7), d(2026, 3, 9))).toBe(2);
  });

  it("is negative when the target is in the past", () => {
    expect(daysBetween(d(2026, 1, 10), d(2026, 1, 5))).toBe(-5);
  });
});

describe("bucketForDaysUntil", () => {
  it("buckets the boundaries correctly", () => {
    expect(bucketForDaysUntil(0)).toBe("today");
    expect(bucketForDaysUntil(7)).toBe("next7");
    expect(bucketForDaysUntil(8)).toBe("next30");
    expect(bucketForDaysUntil(30)).toBe("next30");
    expect(bucketForDaysUntil(31)).toBe("later");
  });
});

describe("resolveUpcoming", () => {
  it("sorts soonest-first and drops passed non-recurring dates", () => {
    type Item = { label: string; month: number; day: number; year: number | null; recursAnnually: boolean };
    const items: Item[] = [
      { label: "far", month: 12, day: 25, year: null, recursAnnually: true },
      { label: "soon", month: 1, day: 3, year: null, recursAnnually: true },
      { label: "passed one-off", month: 1, day: 1, year: 2020, recursAnnually: false },
    ];
    const result = resolveUpcoming(items, (i) => i, d(2026, 1, 1));
    expect(result.map((r) => r.item.label)).toEqual(["soon", "far"]);
    expect(result[0]?.daysUntil).toBe(2);
  });
});

describe("isInReminderWindow", () => {
  it("fires only on the exact offset day", () => {
    const occurrence = d(2026, 6, 15);
    expect(isInReminderWindow(occurrence, d(2026, 6, 1), 14)).toBe(true);
    expect(isInReminderWindow(occurrence, d(2026, 6, 8), 7)).toBe(true);
    expect(isInReminderWindow(occurrence, d(2026, 6, 14), 1)).toBe(true);
    expect(isInReminderWindow(occurrence, d(2026, 6, 15), 0)).toBe(true);
    expect(isInReminderWindow(occurrence, d(2026, 6, 2), 14)).toBe(false);
  });
});

describe("calendarDateInTimeZone", () => {
  it("can put the calendar date on different sides of midnight depending on the zone", () => {
    // 2026-06-15T23:30:00Z is already 2026-06-16 in a positive-offset zone,
    // demonstrating this is genuinely timezone-aware, not just UTC-truncating.
    const instant = new Date("2026-06-15T23:30:00Z");
    expect(calendarDateInTimeZone(instant, "UTC")).toEqual(d(2026, 6, 15));
    expect(calendarDateInTimeZone(instant, "Pacific/Auckland")).toEqual(d(2026, 6, 16));
    expect(calendarDateInTimeZone(instant, "America/Los_Angeles")).toEqual(d(2026, 6, 15));
  });
});
