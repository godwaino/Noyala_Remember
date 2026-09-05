import { describe, expect, it } from "vitest";
import { bucketFollowUp, daysSince, getReconnectStatus, sortFollowUpsForDisplay } from "../relationship-care";

const NOW = new Date("2026-09-05T12:00:00Z");

describe("daysSince", () => {
  it("computes whole elapsed days", () => {
    expect(daysSince(new Date("2026-09-01T12:00:00Z"), NOW)).toBe(4);
  });

  it("rounds down for a partial day", () => {
    expect(daysSince(new Date("2026-09-05T00:00:00Z"), NOW)).toBe(0);
  });
});

describe("getReconnectStatus", () => {
  it("is never due when no cadence is set", () => {
    const status = getReconnectStatus(
      { cadenceDays: null, lastInteractionAt: new Date("2020-01-01"), snoozedUntil: null },
      NOW,
    );
    expect(status.due).toBe(false);
  });

  it("is due immediately when a cadence is set but nothing has ever been logged", () => {
    const status = getReconnectStatus(
      { cadenceDays: 30, lastInteractionAt: null, snoozedUntil: null },
      NOW,
    );
    expect(status).toEqual({ due: true, daysSinceLastInteraction: null });
  });

  it("is not due when fewer days than the cadence have passed", () => {
    const status = getReconnectStatus(
      { cadenceDays: 30, lastInteractionAt: new Date("2026-08-20T12:00:00Z"), snoozedUntil: null },
      NOW,
    );
    expect(status.due).toBe(false);
    expect(status.daysSinceLastInteraction).toBe(16);
  });

  it("is due once at least the cadence has elapsed", () => {
    const status = getReconnectStatus(
      { cadenceDays: 14, lastInteractionAt: new Date("2026-08-20T12:00:00Z"), snoozedUntil: null },
      NOW,
    );
    expect(status.due).toBe(true);
    expect(status.daysSinceLastInteraction).toBe(16);
  });

  it("is not due while snoozed, even if otherwise overdue", () => {
    const status = getReconnectStatus(
      {
        cadenceDays: 14,
        lastInteractionAt: new Date("2026-08-01T12:00:00Z"),
        snoozedUntil: new Date("2026-09-10T00:00:00Z"),
      },
      NOW,
    );
    expect(status.due).toBe(false);
  });

  it("is due again once the snooze has passed", () => {
    const status = getReconnectStatus(
      {
        cadenceDays: 14,
        lastInteractionAt: new Date("2026-08-01T12:00:00Z"),
        snoozedUntil: new Date("2026-09-01T00:00:00Z"),
      },
      NOW,
    );
    expect(status.due).toBe(true);
  });
});

describe("bucketFollowUp", () => {
  it("buckets an undated follow-up as no_date", () => {
    expect(bucketFollowUp(null, NOW)).toBe("no_date");
  });

  it("buckets a past due date as overdue", () => {
    expect(bucketFollowUp(new Date("2026-09-01T00:00:00Z"), NOW)).toBe("overdue");
  });

  it("buckets a near-future due date as due_soon", () => {
    expect(bucketFollowUp(new Date("2026-09-07T00:00:00Z"), NOW)).toBe("due_soon");
  });

  it("buckets a far-future due date as later", () => {
    expect(bucketFollowUp(new Date("2026-10-01T00:00:00Z"), NOW)).toBe("later");
  });
});

describe("sortFollowUpsForDisplay", () => {
  it("orders overdue, then due-soon, then later, then undated, earliest first within each", () => {
    const items = [
      { id: "later-2", dueAt: new Date("2026-11-01T00:00:00Z") },
      { id: "no-date", dueAt: null },
      { id: "overdue-2", dueAt: new Date("2026-09-02T00:00:00Z") },
      { id: "due-soon", dueAt: new Date("2026-09-06T00:00:00Z") },
      { id: "overdue-1", dueAt: new Date("2026-09-01T00:00:00Z") },
      { id: "later-1", dueAt: new Date("2026-10-01T00:00:00Z") },
    ];

    expect(sortFollowUpsForDisplay(items, NOW).map((i) => i.id)).toEqual([
      "overdue-1",
      "overdue-2",
      "due-soon",
      "later-1",
      "later-2",
      "no-date",
    ]);
  });

  it("does not mutate the input array", () => {
    const items = [{ id: "a", dueAt: null }];
    const sorted = sortFollowUpsForDisplay(items, NOW);
    expect(sorted).not.toBe(items);
  });
});
