import type { MessageDraft, MessageHistoryEntry } from "@noyala/domain";

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

/** Shape stashed in message_drafts.model_metadata — see actions.ts. */
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
