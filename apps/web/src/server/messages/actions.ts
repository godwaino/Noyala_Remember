"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MessageAction, MessageChannel, MessageTone } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { generateDraftsCore } from "./generate";

export interface GenerateDraftFormState {
  status: "idle" | "error";
  message?: string;
}

const TONES: MessageTone[] = [
  "short_and_warm",
  "thoughtful",
  "funny",
  "professional",
  "faith_based",
  "custom",
];
const CHANNELS: MessageChannel[] = ["whatsapp", "sms", "email"];

export async function generateMessageDraft(
  personId: string,
  _prevState: GenerateDraftFormState,
  formData: FormData,
): Promise<GenerateDraftFormState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const occasion = String(formData.get("occasion") ?? "").trim();
  const tone = String(formData.get("tone") ?? "") as MessageTone;
  const channel = String(formData.get("channel") ?? "") as MessageChannel;
  const customInstruction = String(formData.get("customInstruction") ?? "").trim() || null;
  const importantDateId = String(formData.get("importantDateId") ?? "").trim() || null;
  const selectedMemoryIds = formData.getAll("memoryIds").map(String);

  if (!TONES.includes(tone)) return { status: "error", message: "Choose a tone" };
  if (!CHANNELS.includes(channel)) return { status: "error", message: "Choose a channel" };

  const result = await generateDraftsCore(supabase, user.id, {
    personId,
    occasion,
    tone,
    channel,
    importantDateId,
    memoryIds: selectedMemoryIds,
    customInstruction,
  });

  if (!result.ok) {
    reportError(new Error(result.message), { action: "generateMessageDraft", personId });
    return { status: "error", message: result.message };
  }

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}/drafts/${result.batchId}`);
}

export async function updateMessageDraftContent(
  personId: string,
  batchId: string,
  draftId: string,
  formData: FormData,
): Promise<void> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("message_drafts")
    .update({ content })
    .eq("id", draftId);
  if (error) reportError(error, { action: "updateMessageDraftContent", draftId });

  revalidatePath(`/people/${personId}/drafts/${batchId}`);
}

/**
 * Records what the user actually did with a draft. `opened_in_app` is
 * never proof of delivery — Master Build Prompt §9 — the UI must label it
 * as such, not as "sent."
 */
export async function recordMessageAction(
  personId: string,
  batchId: string,
  draftId: string,
  action: MessageAction,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: draft, error: draftError } = await supabase
    .from("message_drafts")
    .select("content, channel, important_date_id")
    .eq("id", draftId)
    .maybeSingle();
  if (draftError) {
    reportError(draftError, { action: "recordMessageAction.loadDraft", draftId });
    return;
  }
  if (!draft || !draft.content) return;

  const { error: insertError } = await supabase.from("message_history").insert({
    user_id: user.id,
    person_id: personId,
    important_date_id: draft.important_date_id,
    final_content: draft.content,
    channel: draft.channel,
    action,
  });
  if (insertError) {
    reportError(insertError, { action: "recordMessageAction.insert", draftId });
    return;
  }

  revalidatePath(`/people/${personId}/drafts/${batchId}`);
  revalidatePath("/drafts");
}
