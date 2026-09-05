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

export const RELATIONSHIP_TYPE_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "partner", label: "Partner" },
  { value: "family", label: "Family" },
  { value: "friend", label: "Friend" },
  { value: "colleague", label: "Colleague" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "other", label: "Other" },
];

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
  /** Days between reconnects, e.g. 30/60/90 — null means no cadence set.
   * Deliberately just a day-count: no score, streak or ranking anywhere
   * in this schema. See docs/product.md. */
  reconnectCadenceDays: number | null;
  /** A user-chosen "don't suggest reconnecting before this date" — the
   * snooze control Master Build Prompt §4 asks for. */
  reconnectSnoozedUntil: string | null;
  /** Durable gift context (Stage 6) — not per gift idea. */
  giftPreferences: string | null;
  giftExclusions: string | null;
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

export type InteractionType = "call" | "visit" | "message" | "meeting" | "other";

export interface Interaction {
  id: UUID;
  userId: UUID;
  personId: UUID;
  type: InteractionType;
  occurredAt: ISODateTime;
  summary: string | null;
  source: "manual";
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type FollowUpStatus = "open" | "completed" | "dismissed";

export interface FollowUp {
  id: UUID;
  userId: UUID;
  personId: UUID;
  interactionId: UUID | null;
  description: string;
  dueAt: ISODateTime | null;
  status: FollowUpStatus;
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

/** Stage 6: shared circles and gifting. See docs/permissions.md. */
export type CircleRole = "owner" | "organiser" | "viewer";

export interface Circle {
  id: UUID;
  ownerUserId: UUID;
  name: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CircleMember {
  id: UUID;
  circleId: UUID;
  userId: UUID;
  role: CircleRole;
  /** Which person-record (in any member's own people list) represents this
   * member, so surprise gifts about them can be hidden from their own
   * view. Null until the member self-identifies. */
  linkedPersonId: UUID | null;
  createdAt: ISODateTime;
}

export type CircleInvitationStatus = "pending" | "accepted" | "declined" | "revoked";

export interface CircleInvitation {
  id: UUID;
  circleId: UUID;
  invitedEmail: string;
  invitedByUserId: UUID;
  role: Exclude<CircleRole, "owner">;
  token: UUID;
  status: CircleInvitationStatus;
  createdAt: ISODateTime;
  respondedAt: ISODateTime | null;
}

export interface PersonShare {
  id: UUID;
  ownerUserId: UUID;
  personId: UUID;
  circleId: UUID;
  shareMemories: boolean;
  shareGiftPlanning: boolean;
  createdAt: ISODateTime;
  revokedAt: ISODateTime | null;
}

export type GiftIdeaStatus = "idea" | "planned" | "purchased" | "given";

export interface GiftIdea {
  id: UUID;
  circleId: UUID;
  personId: UUID;
  createdByUserId: UUID;
  title: string;
  description: string | null;
  occasion: string | null;
  budgetAmount: number | null;
  /** ISO 4217, e.g. "GBP". Null exactly when budgetAmount is null. */
  budgetCurrency: string | null;
  deadlineAt: ISODateTime | null;
  linkUrl: string | null;
  status: GiftIdeaStatus;
  claimedByUserId: UUID | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}
