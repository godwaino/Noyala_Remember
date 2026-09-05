import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MessageDraft, MessageHistoryEntry } from "@noyala/domain";
import {
  readDraftMetadata,
  toMessageDraft,
  toMessageHistoryEntry,
  type MessageDraftRow,
  type MessageHistoryRow,
} from "./mappers";

/** The three options generated together, newest option order preserved. */
export async function getDraftBatch(
  client: SupabaseClient,
  batchId: string,
): Promise<MessageDraft[]> {
  const { data, error } = await client
    .from("message_drafts")
    .select("*")
    .eq("model_metadata->>batchId", batchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load message draft batch: ${error.message}`);
  return (data as MessageDraftRow[]).map(toMessageDraft);
}

export interface DraftBatchSummary {
  batchId: string;
  createdAt: string;
  tone: MessageDraft["tone"];
  channel: MessageDraft["channel"];
  occasion: string;
}

/** Most recent generations for a person, one row per batch (not per option). */
export async function listRecentDraftBatchesForPerson(
  client: SupabaseClient,
  personId: string,
  limit = 5,
): Promise<DraftBatchSummary[]> {
  const { data, error } = await client
    .from("message_drafts")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list message drafts: ${error.message}`);

  const drafts = (data as MessageDraftRow[]).map(toMessageDraft);
  const seen = new Set<string>();
  const summaries: DraftBatchSummary[] = [];
  for (const draft of drafts) {
    const metadata = readDraftMetadata(draft);
    if (!metadata || seen.has(metadata.batchId)) continue;
    seen.add(metadata.batchId);
    summaries.push({
      batchId: metadata.batchId,
      createdAt: draft.createdAt,
      tone: draft.tone,
      channel: draft.channel,
      occasion: metadata.generation.occasion,
    });
    if (summaries.length >= limit) break;
  }
  return summaries;
}

/** Account-wide message action history, most recent first — the audit trail
 * Master Build Prompt §4 calls "message action history with accurate state
 * labels." */
export async function listMessageHistoryForUser(
  client: SupabaseClient,
  limit = 50,
): Promise<(MessageHistoryEntry & { personFirstName: string })[]> {
  const { data, error } = await client
    .from("message_history")
    .select("*, people(first_name)")
    .order("acted_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list message history: ${error.message}`);

  return (data as (MessageHistoryRow & { people: { first_name: string } })[]).map((row) => ({
    ...toMessageHistoryEntry(row),
    personFirstName: row.people.first_name,
  }));
}
