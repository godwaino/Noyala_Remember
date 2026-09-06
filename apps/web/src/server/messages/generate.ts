import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isRateLimited,
  selectMessageFacts,
  type MessageChannel,
  type MessageGenerationContext,
  type MessageTone,
} from "@noyala/domain";
import { getMessageProvider } from "@/server/ai/message-provider";
import { getPerson } from "@/server/people/queries";
import { listMemoriesForPerson } from "@/server/memories/queries";
import { getImportantDate } from "@/server/important-dates/queries";
import { reportError } from "@/server/observability/error-monitoring";
import type { DraftGenerationMetadata } from "./mappers";

/** A technical safety cap, not a validated product number — see
 * docs/integrations.md's "Acceptance budgets" section. */
const RATE_LIMIT_MAX_PER_HOUR = Number(process.env.AI_GENERATION_MAX_PER_HOUR ?? 20);
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export interface GenerateDraftsParams {
  personId: string;
  occasion: string;
  tone: MessageTone;
  channel: MessageChannel;
  importantDateId?: string | null;
  memoryIds: string[];
  customInstruction?: string | null;
}

export type GenerateDraftsResult =
  | { ok: true; batchId: string; rows: Record<string, unknown>[] }
  | { ok: false; status: number; message: string };

/**
 * The actual generation + rate-limit + insert logic, shared by the
 * `/people/[personId]/drafts/new` server action (apps/web/src/server/messages/actions.ts)
 * and the mobile-facing route handler
 * (apps/web/src/app/api/mobile/message-drafts/route.ts) — extracted so
 * apps/mobile doesn't need its own copy of anything that touches the AI
 * provider key or the rate limiter, both of which must stay server-only.
 */
export async function generateDraftsCore(
  supabase: SupabaseClient,
  userId: string,
  params: GenerateDraftsParams,
): Promise<GenerateDraftsResult> {
  if (!params.occasion.trim()) return { ok: false, status: 400, message: "Occasion is required" };

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { data: recent, error: recentError } = await supabase
    .from("message_drafts")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", since);
  if (recentError) {
    reportError(recentError, { action: "generateDraftsCore.rateLimitCheck", personId: params.personId });
    return { ok: false, status: 500, message: "Something went wrong. Please try again." };
  }
  const recentTimestamps = ((recent ?? []) as { created_at: string }[]).map((r) => new Date(r.created_at));
  if (isRateLimited(recentTimestamps, new Date(), RATE_LIMIT_MAX_PER_HOUR, RATE_LIMIT_WINDOW_MS)) {
    return {
      ok: false,
      status: 429,
      message: "You've reached the message-generation limit for now — try again shortly.",
    };
  }

  const [person, memories, importantDate, previousMessages] = await Promise.all([
    getPerson(supabase, params.personId),
    listMemoriesForPerson(supabase, params.personId),
    params.importantDateId ? getImportantDate(supabase, params.importantDateId) : Promise.resolve(null),
    supabase
      .from("message_history")
      .select("final_content")
      .eq("person_id", params.personId)
      .order("acted_at", { ascending: false })
      .limit(2),
  ]);
  if (!person) return { ok: false, status: 404, message: "Person not found" };

  const facts = selectMessageFacts(memories, params.memoryIds);
  const previousMessageSnippets = ((previousMessages.data ?? []) as { final_content: string }[]).map((row) =>
    row.final_content.slice(0, 200),
  );

  const context: MessageGenerationContext = {
    recipientDisplayName: person.nickname || person.firstName,
    relationshipType: person.relationshipType,
    occasion: params.occasion,
    tone: params.tone,
    channel: params.channel,
    facts,
    customInstruction: params.customInstruction ?? undefined,
    previousMessageSnippets: previousMessageSnippets.length > 0 ? previousMessageSnippets : undefined,
  };

  const provider = getMessageProvider();
  const outcome = await provider.generateMessages(context);
  if (!outcome.success) {
    reportError(new Error(outcome.reason), {
      action: "generateDraftsCore",
      personId: params.personId,
      reason: outcome.reason,
    });
    return { ok: false, status: 502, message: "Couldn't generate messages right now — please try again." };
  }

  const batchId = randomUUID();
  const contextSnapshot = {
    occasion: params.occasion,
    tone: params.tone,
    channel: params.channel,
    customInstruction: params.customInstruction ?? null,
    importantDateId: importantDate?.id ?? null,
    facts,
  };

  const rows = outcome.options.map((option) => {
    const metadata: DraftGenerationMetadata = {
      batchId,
      optionLabel: option.label,
      provider: outcome.provider,
      generation: {
        occasion: params.occasion,
        tone: params.tone,
        channel: params.channel,
        customInstruction: params.customInstruction ?? null,
        importantDateId: importantDate?.id ?? null,
        selectedMemoryIds: params.memoryIds,
      },
    };
    return {
      user_id: userId,
      person_id: params.personId,
      important_date_id: importantDate?.id ?? null,
      tone: params.tone,
      channel: params.channel,
      context_snapshot: contextSnapshot,
      content: option.content,
      generation_status: "succeeded" as const,
      model_metadata: { ...metadata, ...outcome.modelMetadata },
    };
  });

  const { data: inserted, error: insertError } = await supabase.from("message_drafts").insert(rows).select("*");
  if (insertError || !inserted) {
    reportError(insertError, { action: "generateDraftsCore.insert", personId: params.personId });
    return { ok: false, status: 500, message: "Couldn't save the generated drafts." };
  }

  return { ok: true, batchId, rows: inserted };
}
