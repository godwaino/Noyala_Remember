"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  isRateLimited,
  selectMessageFacts,
  type MessageAction,
  type MessageChannel,
  type MessageGenerationContext,
  type MessageTone,
} from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getMessageProvider } from "@/server/ai/message-provider";
import { getPerson } from "@/server/people/queries";
import { listMemoriesForPerson } from "@/server/memories/queries";
import { getImportantDate } from "@/server/important-dates/queries";
import { reportError } from "@/server/observability/error-monitoring";
import type { DraftGenerationMetadata } from "./mappers";

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

/** A technical safety cap, not a validated product number — see
 * docs/integrations.md's "Acceptance budgets" section. */
const RATE_LIMIT_MAX_PER_HOUR = Number(process.env.AI_GENERATION_MAX_PER_HOUR ?? 20);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

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

  if (!occasion) return { status: "error", message: "Occasion is required" };
  if (!TONES.includes(tone)) return { status: "error", message: "Choose a tone" };
  if (!CHANNELS.includes(channel)) return { status: "error", message: "Choose a channel" };

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("message_drafts")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (recentError) {
    reportError(recentError, { action: "generateMessageDraft.rateLimitCheck", personId });
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  const recentTimestamps = ((recent ?? []) as { created_at: string }[]).map(
    (r) => new Date(r.created_at),
  );
  if (isRateLimited(recentTimestamps, new Date(), RATE_LIMIT_MAX_PER_HOUR, RATE_LIMIT_WINDOW_MS)) {
    return {
      status: "error",
      message: "You've reached the message-generation limit for now — try again shortly.",
    };
  }

  const [person, memories, importantDate, previousMessages] = await Promise.all([
    getPerson(supabase, personId),
    listMemoriesForPerson(supabase, personId),
    importantDateId ? getImportantDate(supabase, importantDateId) : Promise.resolve(null),
    supabase
      .from("message_history")
      .select("final_content")
      .eq("person_id", personId)
      .order("acted_at", { ascending: false })
      .limit(2),
  ]);
  if (!person) return { status: "error", message: "Person not found" };

  const facts = selectMessageFacts(memories, selectedMemoryIds);
  const previousMessageSnippets = (
    (previousMessages.data ?? []) as { final_content: string }[]
  ).map((row) => row.final_content.slice(0, 200));

  const context: MessageGenerationContext = {
    recipientDisplayName: person.nickname || person.firstName,
    relationshipType: person.relationshipType,
    occasion,
    tone,
    channel,
    facts,
    customInstruction: customInstruction ?? undefined,
    previousMessageSnippets:
      previousMessageSnippets.length > 0 ? previousMessageSnippets : undefined,
  };

  const provider = getMessageProvider();
  const outcome = await provider.generateMessages(context);

  if (!outcome.success) {
    reportError(new Error(outcome.reason), {
      action: "generateMessageDraft",
      personId,
      reason: outcome.reason,
    });
    return {
      status: "error",
      message: "Couldn't generate messages right now — please try again.",
    };
  }

  const batchId = randomUUID();
  const contextSnapshot = {
    occasion,
    tone,
    channel,
    customInstruction,
    importantDateId: importantDate?.id ?? null,
    // Exactly the facts actually used — Master Build Prompt §5's "immutable
    // context snapshot containing only the selected facts used."
    facts,
  };

  const rows = outcome.options.map((option) => {
    const metadata: DraftGenerationMetadata = {
      batchId,
      optionLabel: option.label,
      provider: outcome.provider,
      generation: {
        occasion,
        tone,
        channel,
        customInstruction,
        importantDateId: importantDate?.id ?? null,
        selectedMemoryIds,
      },
    };
    return {
      user_id: user.id,
      person_id: personId,
      important_date_id: importantDate?.id ?? null,
      tone,
      channel,
      context_snapshot: contextSnapshot,
      content: option.content,
      generation_status: "succeeded" as const,
      model_metadata: { ...metadata, ...outcome.modelMetadata },
    };
  });

  const { error: insertError } = await supabase.from("message_drafts").insert(rows);
  if (insertError) {
    reportError(insertError, { action: "generateMessageDraft.insert", personId });
    return { status: "error", message: "Couldn't save the generated drafts." };
  }

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}/drafts/${batchId}`);
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
