import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateMobileRequest } from "@/server/supabase/bearer-client";
import { generateDraftsCore } from "@/server/messages/generate";
import { toMessageDraft, type MessageDraftRow } from "@/server/messages/mappers";
import { reportError } from "@/server/observability/error-monitoring";

const bodySchema = z.object({
  personId: z.string().uuid(),
  occasion: z.string().trim().min(1),
  tone: z.enum(["short_and_warm", "thoughtful", "funny", "professional", "faith_based", "custom"]),
  channel: z.enum(["whatsapp", "sms", "email"]),
  importantDateId: z.string().uuid().nullable().optional(),
  memoryIds: z.array(z.string().uuid()).default([]),
  customInstruction: z.string().trim().optional(),
});

/**
 * apps/mobile's equivalent of the `/people/[personId]/drafts/new` server
 * action — generation needs the AI provider key and the per-user rate
 * limiter, both server-only, so this is the one Message Studio step that
 * can't be a direct Supabase call from the phone. Bearer-token
 * authenticated (see bearer-client.ts) instead of cookie-based, since
 * React Native has no cookie jar to share with this server.
 */
export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const result = await generateDraftsCore(auth.client, auth.user.id, parsed.data);
  if (!result.ok) {
    reportError(new Error(result.message), { action: "mobile.generateDrafts", personId: parsed.data.personId });
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({
    batchId: result.batchId,
    drafts: (result.rows as unknown as MessageDraftRow[]).map(toMessageDraft),
    provider: (result.rows[0]?.model_metadata as { provider?: string } | null)?.provider ?? "demo",
  });
}
