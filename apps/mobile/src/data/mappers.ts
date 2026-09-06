/**
 * Row (snake_case) -> domain (camelCase) mappers, one per table this app
 * reads or writes directly under RLS. Deliberately duplicated from
 * apps/web/src/server/*\/mappers.ts rather than imported: apps/mobile
 * depends only on @noyala/domain and @noyala/brand (see
 * docs/architecture.md's boundaries), not on apps/web's server-only code.
 * Each function here is a 1:1 mechanical mirror of its web counterpart —
 * keep them in sync if a migration changes a column.
 */
import type {
  Circle,
  CircleInvitation,
  CircleMember,
  Consent,
  FollowUp,
  GiftIdea,
  ImportantDate,
  Interaction,
  Memory,
  MessageDraft,
  MessageHistoryEntry,
  Person,
  PersonShare,
  Profile,
  VoiceCapture,
  ExtractedMemoryCandidate,
} from "@noyala/domain";

export interface PersonRow {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string | null;
  nickname: string | null;
  relationship_type: Person["relationshipType"];
  phone: string | null;
  email: string | null;
  pronouns: string | null;
  notes: string | null;
  reconnect_cadence_days: number | null;
  reconnect_snoozed_until: string | null;
  gift_preferences: string | null;
  gift_exclusions: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toPerson(row: PersonRow): Person {
  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    nickname: row.nickname,
    relationshipType: row.relationship_type,
    phone: row.phone,
    email: row.email,
    pronouns: row.pronouns,
    notes: row.notes,
    reconnectCadenceDays: row.reconnect_cadence_days,
    reconnectSnoozedUntil: row.reconnect_snoozed_until,
    giftPreferences: row.gift_preferences,
    giftExclusions: row.gift_exclusions,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function blankToNull(value: string | undefined | null): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

export interface ImportantDateRow {
  id: string;
  user_id: string;
  person_id: string;
  type: ImportantDate["type"];
  label: string;
  month: number;
  day: number;
  year: number | null;
  recurs_annually: boolean;
  reminder_offsets: number[];
  timezone: string;
  created_at: string;
  updated_at: string;
}

export function toImportantDate(row: ImportantDateRow): ImportantDate {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    type: row.type,
    label: row.label,
    month: row.month,
    day: row.day,
    year: row.year,
    recursAnnually: row.recurs_annually,
    reminderOffsets: row.reminder_offsets,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MemoryRow {
  id: string;
  user_id: string;
  person_id: string;
  content: string;
  category: Memory["category"];
  occurred_on: string | null;
  sensitivity: Memory["sensitivity"];
  source: "manual";
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toMemory(row: MemoryRow): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    content: row.content,
    category: row.category,
    occurredOn: row.occurred_on,
    sensitivity: row.sensitivity,
    source: row.source,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface InteractionRow {
  id: string;
  user_id: string;
  person_id: string;
  type: Interaction["type"];
  occurred_at: string;
  summary: string | null;
  source: "manual";
  created_at: string;
  updated_at: string;
}

export function toInteraction(row: InteractionRow): Interaction {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    type: row.type,
    occurredAt: row.occurred_at,
    summary: row.summary,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface FollowUpRow {
  id: string;
  user_id: string;
  person_id: string;
  interaction_id: string | null;
  description: string;
  due_at: string | null;
  status: FollowUp["status"];
  created_at: string;
  updated_at: string;
}

export function toFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    interactionId: row.interaction_id,
    description: row.description,
    dueAt: row.due_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MessageDraftRow {
  id: string;
  user_id: string;
  person_id: string;
  important_date_id: string | null;
  tone: MessageDraft["tone"];
  channel: MessageDraft["channel"];
  context_snapshot: unknown;
  content: string | null;
  generation_status: MessageDraft["generationStatus"];
  model_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export function toMessageDraft(row: MessageDraftRow): MessageDraft {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    importantDateId: row.important_date_id,
    tone: row.tone,
    channel: row.channel,
    contextSnapshot: row.context_snapshot,
    content: row.content,
    generationStatus: row.generation_status,
    modelMetadata: row.model_metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface MessageHistoryRow {
  id: string;
  user_id: string;
  person_id: string;
  important_date_id: string | null;
  final_content: string;
  channel: MessageHistoryEntry["channel"];
  action: MessageHistoryEntry["action"];
  acted_at: string;
}

export function toMessageHistoryEntry(row: MessageHistoryRow): MessageHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    importantDateId: row.important_date_id,
    finalContent: row.final_content,
    channel: row.channel,
    action: row.action,
    actedAt: row.acted_at,
  };
}

export interface DraftGenerationMetadata {
  batchId: string;
  optionLabel: string;
  provider: string;
  generation: {
    occasion: string;
    tone: MessageDraft["tone"];
    channel: MessageDraft["channel"];
    customInstruction: string | null;
    importantDateId: string | null;
    selectedMemoryIds: string[];
  };
}

export function readDraftMetadata(draft: MessageDraft): DraftGenerationMetadata | null {
  const metadata = draft.modelMetadata as Partial<DraftGenerationMetadata> | null;
  if (!metadata || typeof metadata.batchId !== "string") return null;
  return metadata as DraftGenerationMetadata;
}

export interface GiftIdeaRow {
  id: string;
  circle_id: string;
  person_id: string;
  created_by_user_id: string;
  title: string;
  description: string | null;
  occasion: string | null;
  budget_amount: number | null;
  budget_currency: string | null;
  deadline_at: string | null;
  link_url: string | null;
  status: GiftIdea["status"];
  claimed_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export function toGiftIdea(row: GiftIdeaRow): GiftIdea {
  return {
    id: row.id,
    circleId: row.circle_id,
    personId: row.person_id,
    createdByUserId: row.created_by_user_id,
    title: row.title,
    description: row.description,
    occasion: row.occasion,
    budgetAmount: row.budget_amount,
    budgetCurrency: row.budget_currency,
    deadlineAt: row.deadline_at,
    linkUrl: row.link_url,
    status: row.status,
    claimedByUserId: row.claimed_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CircleRow {
  id: string;
  owner_user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function toCircle(row: CircleRow): Circle {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CircleMemberRow {
  id: string;
  circle_id: string;
  user_id: string;
  role: CircleMember["role"];
  linked_person_id: string | null;
  created_at: string;
}

export function toCircleMember(row: CircleMemberRow): CircleMember {
  return {
    id: row.id,
    circleId: row.circle_id,
    userId: row.user_id,
    role: row.role,
    linkedPersonId: row.linked_person_id,
    createdAt: row.created_at,
  };
}

export interface CircleInvitationRow {
  id: string;
  circle_id: string;
  invited_email: string;
  invited_by_user_id: string;
  role: CircleInvitation["role"];
  token: string;
  status: CircleInvitation["status"];
  created_at: string;
  responded_at: string | null;
}

export function toCircleInvitation(row: CircleInvitationRow): CircleInvitation {
  return {
    id: row.id,
    circleId: row.circle_id,
    invitedEmail: row.invited_email,
    invitedByUserId: row.invited_by_user_id,
    role: row.role,
    token: row.token,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export interface PersonShareRow {
  id: string;
  owner_user_id: string;
  person_id: string;
  circle_id: string;
  share_memories: boolean;
  share_gift_planning: boolean;
  created_at: string;
  revoked_at: string | null;
}

export function toPersonShare(row: PersonShareRow): PersonShare {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    personId: row.person_id,
    circleId: row.circle_id,
    shareMemories: row.share_memories,
    shareGiftPlanning: row.share_gift_planning,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}

export interface ProfileRow {
  user_id: string;
  display_name: string;
  timezone: string;
  locale: string;
  default_tone: Profile["defaultTone"];
  default_reminder_offsets: number[];
  preferred_reminder_channel: Profile["preferredReminderChannel"];
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    timezone: row.timezone,
    locale: row.locale,
    defaultTone: row.default_tone,
    defaultReminderOffsets: row.default_reminder_offsets,
    preferredReminderChannel: row.preferred_reminder_channel,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ConsentRow {
  id: string;
  user_id: string;
  consent_type: Consent["consentType"];
  granted_at: string;
  withdrawn_at: string | null;
}

export function toConsent(row: ConsentRow): Consent {
  return {
    id: row.id,
    userId: row.user_id,
    consentType: row.consent_type,
    grantedAt: row.granted_at,
    withdrawnAt: row.withdrawn_at,
  };
}

export interface VoiceCaptureRow {
  id: string;
  user_id: string;
  person_id: string | null;
  storage_path: string | null;
  duration_seconds: number;
  transcription_status: VoiceCapture["transcriptionStatus"];
  transcript: string | null;
  audio_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toVoiceCapture(row: VoiceCaptureRow): VoiceCapture {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    storagePath: row.storage_path ?? "",
    durationSeconds: row.duration_seconds,
    transcriptionStatus: row.transcription_status,
    transcript: row.transcript,
    audioDeletedAt: row.audio_deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ExtractedMemoryCandidateRow {
  id: string;
  user_id: string;
  voice_capture_id: string;
  person_id: string | null;
  proposed_content: string;
  proposed_category: ExtractedMemoryCandidate["proposedCategory"];
  status: ExtractedMemoryCandidate["status"];
  resulting_memory_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function toExtractedMemoryCandidate(
  row: ExtractedMemoryCandidateRow,
): ExtractedMemoryCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    voiceCaptureId: row.voice_capture_id,
    personId: row.person_id,
    proposedContent: row.proposed_content,
    proposedCategory: row.proposed_category,
    status: row.status,
    resultingMemoryId: row.resulting_memory_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}
