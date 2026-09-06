import type { MessageAction, MessageChannel, MessageDraft, MessageHistoryEntry, MessageTone } from "@noyala/domain";
import { supabase, callMobileApi } from "./client";
import {
  toMessageDraft,
  toMessageHistoryEntry,
  type MessageDraftRow,
  type MessageHistoryRow,
} from "./mappers";

export async function listDraftBatchesForUser(userId: string): Promise<MessageDraft[]> {
  const { data, error } = await supabase
    .from("message_drafts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list drafts: ${error.message}`);
  return (data as MessageDraftRow[]).map(toMessageDraft);
}

export async function listDraftsForPerson(personId: string): Promise<MessageDraft[]> {
  const { data, error } = await supabase
    .from("message_drafts")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list drafts: ${error.message}`);
  return (data as MessageDraftRow[]).map(toMessageDraft);
}

export async function listHistoryForUser(userId: string): Promise<MessageHistoryEntry[]> {
  const { data, error } = await supabase
    .from("message_history")
    .select("*")
    .eq("user_id", userId)
    .order("acted_at", { ascending: false });
  if (error) throw new Error(`Failed to list history: ${error.message}`);
  return (data as MessageHistoryRow[]).map(toMessageHistoryEntry);
}

export async function updateDraftContent(draftId: string, content: string): Promise<void> {
  const { error } = await supabase.from("message_drafts").update({ content }).eq("id", draftId);
  if (error) throw new Error(`Failed to save edit: ${error.message}`);
}

/** `opened_in_app` is never proof of delivery — Master Build Prompt §9 —
 * the UI must label it as a handoff, not a send. */
export async function recordMessageAction(
  userId: string,
  personId: string,
  draft: Pick<MessageDraft, "id" | "content" | "channel" | "importantDateId">,
  action: MessageAction,
): Promise<void> {
  if (!draft.content) return;
  const { error } = await supabase.from("message_history").insert({
    user_id: userId,
    person_id: personId,
    important_date_id: draft.importantDateId,
    final_content: draft.content,
    channel: draft.channel,
    action,
  });
  if (error) throw new Error(`Failed to record action: ${error.message}`);
}

export interface GenerateDraftsParams {
  personId: string;
  occasion: string;
  tone: MessageTone;
  channel: MessageChannel;
  importantDateId?: string | null;
  memoryIds: string[];
  customInstruction?: string;
}

export interface GenerateDraftsResult {
  batchId: string;
  drafts: MessageDraft[];
  provider: string;
}

/** The only mutation in this app that needs a server-side secret (the AI
 * provider key) and a rate-limit check against recent generations, so it
 * goes through apps/web's bearer-token-authenticated route instead of a
 * direct table write — see apps/web/src/app/api/mobile/message-drafts. */
export async function generateDrafts(params: GenerateDraftsParams): Promise<GenerateDraftsResult> {
  return callMobileApi<GenerateDraftsResult>("/api/mobile/message-drafts", {
    method: "POST",
    body: params,
  });
}
