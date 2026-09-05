import { describe, expect, it } from "vitest";
import {
  importantDateInputSchema,
  memoryInputSchema,
  onboardingInputSchema,
  personInputSchema,
} from "../schemas.js";

const validInput = {
  displayName: "Ada",
  timezone: "Europe/London",
  locale: "en",
  defaultReminderOffsets: [14, 7, 1, 0],
  preferredReminderChannel: "email" as const,
  defaultTone: "thoughtful" as const,
  acknowledgedMemoryUsage: true as const,
};

describe("onboardingInputSchema", () => {
  it("accepts a complete, valid submission", () => {
    expect(onboardingInputSchema.parse(validInput)).toMatchObject(validInput);
  });

  it("rejects an invalid IANA timezone", () => {
    const result = onboardingInputSchema.safeParse({
      ...validInput,
      timezone: "Not/AZone",
    });
    expect(result.success).toBe(false);
  });

  it("rejects submission without acknowledging memory usage", () => {
    const result = onboardingInputSchema.safeParse({
      ...validInput,
      acknowledgedMemoryUsage: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty display name", () => {
    const result = onboardingInputSchema.safeParse({ ...validInput, displayName: "  " });
    expect(result.success).toBe(false);
  });
});

describe("personInputSchema", () => {
  const validPerson = { firstName: "Amara", relationshipType: "friend" as const };

  it("accepts a minimal valid person", () => {
    expect(personInputSchema.safeParse(validPerson).success).toBe(true);
  });

  it("rejects an empty first name", () => {
    expect(personInputSchema.safeParse({ ...validPerson, firstName: "  " }).success).toBe(false);
  });

  it("rejects an invalid email when provided", () => {
    const result = personInputSchema.safeParse({ ...validPerson, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("allows an empty-string email (treated as not provided)", () => {
    expect(personInputSchema.safeParse({ ...validPerson, email: "" }).success).toBe(true);
  });

  it("rejects an unknown relationship type", () => {
    const result = personInputSchema.safeParse({ ...validPerson, relationshipType: "lead" });
    expect(result.success).toBe(false);
  });
});

describe("importantDateInputSchema", () => {
  const validDate = {
    type: "birthday" as const,
    label: "Birthday",
    month: 6,
    day: 15,
    year: null,
    recursAnnually: true,
    timezone: "Europe/London",
  };

  it("accepts a recurring date with an unknown year", () => {
    expect(importantDateInputSchema.safeParse(validDate).success).toBe(true);
  });

  it("allows 29 February even outside a leap year (the leap-day policy owns rendering it)", () => {
    const result = importantDateInputSchema.safeParse({ ...validDate, month: 2, day: 29 });
    expect(result.success).toBe(true);
  });

  it("rejects an impossible day for the given month", () => {
    const result = importantDateInputSchema.safeParse({ ...validDate, month: 4, day: 31 });
    expect(result.success).toBe(false);
  });

  it("rejects a non-recurring date with no known year", () => {
    const result = importantDateInputSchema.safeParse({
      ...validDate,
      recursAnnually: false,
      year: null,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a non-recurring date once a year is given", () => {
    const result = importantDateInputSchema.safeParse({
      ...validDate,
      recursAnnually: false,
      year: 2026,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid timezone", () => {
    const result = importantDateInputSchema.safeParse({ ...validDate, timezone: "Nowhere/City" });
    expect(result.success).toBe(false);
  });
});

describe("memoryInputSchema", () => {
  it("accepts a minimal valid memory and defaults category/sensitivity", () => {
    const result = memoryInputSchema.safeParse({ content: "Loves hiking" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.category).toBe("general");
      expect(result.data.sensitivity).toBe("standard");
    }
  });

  it("rejects empty content", () => {
    expect(memoryInputSchema.safeParse({ content: "   " }).success).toBe(false);
  });

  it("accepts an explicit sensitive marking", () => {
    const result = memoryInputSchema.safeParse({ content: "x", sensitivity: "sensitive" });
    expect(result.success).toBe(true);
  });
});
