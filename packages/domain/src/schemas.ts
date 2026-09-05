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

export function isValidTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

const RELATIONSHIP_TYPES = [
  "partner",
  "family",
  "friend",
  "colleague",
  "acquaintance",
  "other",
] as const;

/** Keep in sync with the `people` migration's CHECK constraint. */
export const personInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(120),
  lastName: z.string().trim().max(120).optional().or(z.literal("")),
  nickname: z.string().trim().max(120).optional().or(z.literal("")),
  relationshipType: z.enum(RELATIONSHIP_TYPES),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  pronouns: z.string().trim().max(40).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  // Empty string from a form select means "no cadence set" — never default
  // to a value the user didn't choose.
  reconnectCadenceDays: z
    .union([z.number().int().positive().max(3650), z.null()])
    .optional()
    .transform((v) => v ?? null),
});

export type PersonInput = z.infer<typeof personInputSchema>;

/** Keep in sync with the `important_dates` migration's CHECK constraints. */
export const importantDateInputSchema = z
  .object({
    type: z.enum(["birthday", "anniversary", "custom"]),
    label: z.string().trim().min(1, "Label is required").max(120),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
    // Empty string from a form select means "unknown" — never fabricate a year.
    year: z
      .union([z.number().int().min(1900).max(2100), z.null()])
      .optional()
      .transform((v) => v ?? null),
    recursAnnually: z.boolean().default(true),
    reminderOffsets: z.array(z.number().int().min(0).max(365)).default([14, 7, 1, 0]),
    timezone: z.string().refine(isValidTimeZone, "Must be a valid IANA timezone"),
  })
  .refine((v) => v.recursAnnually || v.year !== null, {
    message: "A one-time (non-recurring) date needs a known year",
    path: ["year"],
  })
  .refine((v) => isValidCalendarDay(v.month, v.day), {
    message: "That day doesn't exist in the given month",
    path: ["day"],
  });

export type ImportantDateInput = z.infer<typeof importantDateInputSchema>;

function isValidCalendarDay(month: number, day: number): boolean {
  // 29 Feb is deliberately allowed here even outside a leap year — that's
  // the whole point of the leap-day policy in packages/domain/src/dates.ts.
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= (daysInMonth[month - 1] ?? 31);
}

const MEMORY_CATEGORIES = [
  "family",
  "work",
  "interest",
  "milestone",
  "gift",
  "preference",
  "general",
] as const;

/** Keep in sync with the `memories` migration's CHECK constraints. */
export const memoryInputSchema = z.object({
  content: z.string().trim().min(1, "Memory can't be empty").max(2000),
  category: z.enum(MEMORY_CATEGORIES).default("general"),
  occurredOn: z.string().trim().max(10).optional().or(z.literal("")),
  sensitivity: z.enum(["standard", "sensitive"]).default("standard"),
});

export type MemoryInput = z.infer<typeof memoryInputSchema>;

const INTERACTION_TYPES = ["call", "visit", "message", "meeting", "other"] as const;

/** Keep in sync with the `interactions` migration's CHECK constraint. */
export const interactionInputSchema = z.object({
  type: z.enum(INTERACTION_TYPES),
  occurredAt: z.string().trim().min(1, "Date is required"),
  summary: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type InteractionInput = z.infer<typeof interactionInputSchema>;

/** Keep in sync with the `follow_ups` migration's CHECK constraint. */
export const followUpInputSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(500),
  dueAt: z.string().trim().max(10).optional().or(z.literal("")),
});

export type FollowUpInput = z.infer<typeof followUpInputSchema>;
