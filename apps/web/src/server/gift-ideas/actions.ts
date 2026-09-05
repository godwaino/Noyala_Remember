"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { giftIdeaInputSchema, type GiftIdeaStatus } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface GiftIdeaFormState {
  status: "idle" | "error";
  message?: string;
}

export async function createGiftIdea(
  personId: string,
  _prevState: GiftIdeaFormState,
  formData: FormData,
): Promise<GiftIdeaFormState> {
  const budgetAmountRaw = formData.get("budgetAmount");
  const budgetCurrencyRaw = formData.get("budgetCurrency");
  const parsed = giftIdeaInputSchema.safeParse({
    personId,
    circleId: formData.get("circleId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    occasion: formData.get("occasion") || undefined,
    budgetAmount:
      budgetAmountRaw && String(budgetAmountRaw).trim() !== "" ? Number(budgetAmountRaw) : null,
    budgetCurrency:
      budgetCurrencyRaw && String(budgetCurrencyRaw).trim() !== "" ? String(budgetCurrencyRaw) : null,
    deadlineAt: formData.get("deadlineAt") || undefined,
    linkUrl: formData.get("linkUrl") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("gift_ideas").insert({
    circle_id: parsed.data.circleId,
    person_id: parsed.data.personId,
    created_by_user_id: user.id,
    title: parsed.data.title,
    description: parsed.data.description || null,
    occasion: parsed.data.occasion || null,
    budget_amount: parsed.data.budgetAmount,
    budget_currency: parsed.data.budgetCurrency,
    deadline_at: parsed.data.deadlineAt ? new Date(parsed.data.deadlineAt).toISOString() : null,
    link_url: parsed.data.linkUrl || null,
  });

  if (error) {
    reportError(error, { action: "createGiftIdea", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  return { status: "idle" };
}

const NEXT_STATUS: Record<GiftIdeaStatus, GiftIdeaStatus | null> = {
  idea: "planned",
  planned: "purchased",
  purchased: "given",
  given: null,
};

/** Advances a gift idea to its next lifecycle stage. Claiming (idea ->
 * planned) also records who claimed it, so the UI can warn about a
 * duplicate before someone else independently buys the same thing. */
export async function advanceGiftIdea(
  personId: string,
  giftIdeaId: string,
  currentStatus: GiftIdeaStatus,
): Promise<void> {
  const nextStatus = NEXT_STATUS[currentStatus];
  if (!nextStatus) return;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const update: { status: GiftIdeaStatus; claimed_by_user_id?: string } = { status: nextStatus };
  if (nextStatus === "planned") update.claimed_by_user_id = user.id;

  const { error } = await supabase.from("gift_ideas").update(update).eq("id", giftIdeaId);
  if (error) reportError(error, { action: "advanceGiftIdea", giftIdeaId });
  revalidatePath(`/people/${personId}`);
}

export async function deleteGiftIdea(personId: string, giftIdeaId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("gift_ideas").delete().eq("id", giftIdeaId);
  if (error) reportError(error, { action: "deleteGiftIdea", giftIdeaId });
  revalidatePath(`/people/${personId}`);
}
