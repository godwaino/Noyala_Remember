import { describe, expect, it } from "vitest";
import { computeRetryDelayMs, reminderDeduplicationKey } from "../outbox.js";

describe("computeRetryDelayMs", () => {
  it("grows exponentially with each attempt", () => {
    expect(computeRetryDelayMs(0)).toBe(1_000);
    expect(computeRetryDelayMs(1)).toBe(2_000);
    expect(computeRetryDelayMs(2)).toBe(4_000);
  });

  it("never exceeds the cap", () => {
    expect(computeRetryDelayMs(20)).toBe(15 * 60 * 1_000);
  });
});

describe("reminderDeduplicationKey", () => {
  it("is stable for the same logical reminder", () => {
    const input = {
      importantDateId: "date-1",
      reminderOffsetDays: 7,
      occurrenceYear: 2026,
    };
    expect(reminderDeduplicationKey(input)).toBe(reminderDeduplicationKey(input));
  });

  it("differs when the offset differs", () => {
    const base = { importantDateId: "date-1", occurrenceYear: 2026 };
    expect(reminderDeduplicationKey({ ...base, reminderOffsetDays: 7 })).not.toBe(
      reminderDeduplicationKey({ ...base, reminderOffsetDays: 0 }),
    );
  });

  it("differs across occurrence years so annual recurrence re-fires", () => {
    const base = { importantDateId: "date-1", reminderOffsetDays: 0 };
    expect(reminderDeduplicationKey({ ...base, occurrenceYear: 2026 })).not.toBe(
      reminderDeduplicationKey({ ...base, occurrenceYear: 2027 }),
    );
  });
});
