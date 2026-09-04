import { z } from "zod";

/**
 * Validated at the server boundary (route handler / server action) before
 * any onboarding write. Keep in sync with the `profiles` migration.
 */
export const onboardingInputSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(120),
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(isValidTimeZone, "Must be a valid IANA timezone, e.g. Europe/London"),
  locale: z.string().min(2).max(35).default("en"),
  defaultReminderOffsets: z
    .array(z.number().int().min(0).max(365))
    .min(1, "Choose at least one reminder offset")
    .default([14, 7, 1, 0]),
  preferredReminderChannel: z.enum(["email", "push"]),
  defaultTone: z.enum([
    "short_and_warm",
    "thoughtful",
    "funny",
    "professional",
    "faith_based",
    "custom",
  ]),
  acknowledgedMemoryUsage: z
    .literal(true, {
      errorMap: () => ({
        message:
          "You must acknowledge how saved personal details may be used before continuing.",
      }),
    }),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}
