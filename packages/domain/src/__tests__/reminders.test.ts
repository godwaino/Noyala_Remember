import { describe, expect, it } from "vitest";
import { discoverReminders, type ReminderSourceDate } from "../reminders";

function makeDate(overrides: Partial<ReminderSourceDate> = {}): ReminderSourceDate {
  return {
    id: "date-1",
    userId: "user-1",
    month: 6,
    day: 15,
    year: 1990,
    recursAnnually: true,
    timezone: "Europe/London",
    reminderOffsets: [14, 7, 1, 0],
    ...overrides,
  };
}

describe("discoverReminders", () => {
  it("fires exactly on each configured offset day, and no others", () => {
    const date = makeDate();

    expect(discoverReminders([date], new Date("2026-06-01T12:00:00Z"))).toHaveLength(1); // 14 days before
    expect(discoverReminders([date], new Date("2026-06-08T12:00:00Z"))).toHaveLength(1); // 7 days before
    expect(discoverReminders([date], new Date("2026-06-14T12:00:00Z"))).toHaveLength(1); // 1 day before
    expect(discoverReminders([date], new Date("2026-06-15T12:00:00Z"))).toHaveLength(1); // the day
    expect(discoverReminders([date], new Date("2026-06-10T12:00:00Z"))).toHaveLength(0); // no match
  });

  it("produces the right offset, occurrence year and a stable dedup key", () => {
    const date = makeDate();
    const result = discoverReminders([date], new Date("2026-06-08T12:00:00Z"));
    expect(result).toHaveLength(1);
    const candidate = result[0]!;

    expect(candidate).toMatchObject({
      importantDateId: "date-1",
      userId: "user-1",
      offsetDays: 7,
      occurrenceYear: 2026,
    });
    expect(candidate.deduplicationKey).toBe("reminder:date-1:2026:7");
  });

  it("does not back-fill a missed earlier offset if the job skipped a day", () => {
    // The 7-day window falls on 8 June; if discovery never ran until 10
    // June (2 days late), it must not retroactively fire the missed
    // 7-day reminder — see docs/state-transitions.md's catch-up rule.
    const date = makeDate();
    const missedWindow = discoverReminders([date], new Date("2026-06-10T12:00:00Z"));
    expect(missedWindow).toHaveLength(0);

    // But the 0-day (on-the-day) reminder still fires correctly once the
    // occurrence actually arrives, regardless of what was missed before it.
    const onTheDay = discoverReminders([date], new Date("2026-06-15T12:00:00Z"));
    expect(onTheDay).toEqual([
      expect.objectContaining({ importantDateId: "date-1", offsetDays: 0 }),
    ]);
  });

  it("is timezone-aware per date", () => {
    // 2026-06-14T23:30 UTC is already 2026-06-15 in a positive-offset zone
    // (Auckland), so the "1 day before" reminder should not fire there —
    // it's already the day itself, so only the 0-offset should match.
    const aucklandDate = makeDate({ timezone: "Pacific/Auckland" });
    const result = discoverReminders([aucklandDate], new Date("2026-06-14T23:30:00Z"));
    expect(result).toEqual([expect.objectContaining({ offsetDays: 0 })]);
  });

  it("skips a non-recurring date once it has passed and never throws", () => {
    const pastOneOff = makeDate({ recursAnnually: false, year: 2020, month: 1, day: 1 });
    expect(discoverReminders([pastOneOff], new Date("2026-01-01T00:00:00Z"))).toEqual([]);
  });

  it("handles multiple users/dates independently in one pass", () => {
    const dateA = makeDate({ id: "date-a", userId: "user-a" });
    const dateB = makeDate({ id: "date-b", userId: "user-b", month: 1, day: 1, reminderOffsets: [0] });

    const result = discoverReminders([dateA, dateB], new Date("2026-06-15T12:00:00Z"));
    expect(result.map((r) => r.importantDateId).sort()).toEqual(["date-a"]);
  });
});
