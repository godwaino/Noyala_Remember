/**
 * Shared entity types, mirroring the tables in supabase/migrations.
 * Framework-free: no Supabase client types, no React. Both apps/web and
 * the future apps/mobile import these.
 */

export type UUID = string;
export type ISODateTime = string;
/** IANA timezone identifier, e.g. "Europe/London". */
export type IANATimezone = string;

export type ReminderChannel = "email" | "push";
export type MessageTone =
  | "short_and_warm"
  | "thoughtful"
  | "funny"
  | "professional"
  | "faith_based"
  | "custom";

export interface Profile {
  userId: UUID;
  displayName: string;
  timezone: IANATimezone;
  locale: string;
  defaultTone: MessageTone;
  defaultReminderOffsets: number[];
  preferredReminderChannel: ReminderChannel;
  onboardingCompletedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type RelationshipType =
  | "partner"
  | "family"
  | "friend"
  | "colleague"
  | "acquaintance"
  | "other";

export interface Person {
  id: UUID;
  userId: UUID;
  firstName: string;
  lastName: string | null;
  nickname: string | null;
  relationshipType: RelationshipType;
  phone: string | null;
  email: string | null;
  pronouns: string | null;
  notes: string | null;
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ImportantDateType = "birthday" | "anniversary" | "custom";

export interface ImportantDate {
  id: UUID;
  userId: UUID;
  personId: UUID;
  type: ImportantDateType;
  label: string;
  month: number;
  day: number;
  /** null means the year is deliberately unknown — never fabricate one. */
  year: number | null;
  recursAnnually: boolean;
  /** Days-before-the-date offsets to remind at. Initially 14, 7, 1 and 0. */
  reminderOffsets: number[];
  timezone: IANATimezone;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type MemoryCategory =
  | "family"
  | "work"
  | "interest"
  | "milestone"
  | "gift"
  | "preference"
  | "general";

export type MemorySensitivity = "standard" | "sensitive";

export interface Memory {
  id: UUID;
  userId: UUID;
  personId: UUID;
  content: string;
  category: MemoryCategory;
  occurredOn: string | null;
  sensitivity: MemorySensitivity;
  source: "manual";
  archivedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type MessageChannel = "whatsapp" | "sms" | "email";
export type GenerationStatus = "pending" | "succeeded" | "failed";

export interface MessageDraft {
  id: UUID;
  userId: UUID;
  personId: UUID;
  importantDateId: UUID | null;
  tone: MessageTone;
  channel: MessageChannel;
  contextSnapshot: unknown;
  content: string | null;
  generationStatus: GenerationStatus;
  modelMetadata: Record<string, unknown> | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type MessageAction = "copied" | "opened_in_app" | "marked_sent";

export interface MessageHistoryEntry {
  id: UUID;
  userId: UUID;
  personId: UUID;
  importantDateId: UUID | null;
  finalContent: string;
  channel: MessageChannel;
  action: MessageAction;
  actedAt: ISODateTime;
}

export type NotificationDeliveryStatus =
  | "scheduled"
  | "sent"
  | "failed"
  | "cancelled";

export interface NotificationDelivery {
  id: UUID;
  userId: UUID;
  importantDateId: UUID;
  scheduledFor: ISODateTime;
  channel: ReminderChannel;
  status: NotificationDeliveryStatus;
  attemptCount: number;
  deduplicationKey: string;
  lastError: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ConsentType =
  | "memory_ai_usage"
  | "contact_import"
  | "marketing_updates";

export interface Consent {
  id: UUID;
  userId: UUID;
  consentType: ConsentType;
  grantedAt: ISODateTime;
  withdrawnAt: ISODateTime | null;
}
