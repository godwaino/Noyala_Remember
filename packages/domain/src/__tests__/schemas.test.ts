import { describe, expect, it } from "vitest";
import { onboardingInputSchema } from "../schemas.js";

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
