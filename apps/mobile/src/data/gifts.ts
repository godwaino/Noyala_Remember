import type { GiftIdea, GiftIdeaStatus } from "@noyala/domain";
import { giftIdeaInputSchema, type GiftIdeaInput } from "@noyala/domain";
import { supabase } from "./client";
import { blankToNull, toGiftIdea, type GiftIdeaRow } from "./mappers";

/** Gift ideas across every circle the caller belongs to — RLS already
 * restricts this to circles they're a member of and, per
 * docs/permissions.md, excludes any gift about the viewer's own linked
 * person (the surprise-mode recipient exclusion). */
export async function listGiftIdeasForCircle(circleId: string): Promise<GiftIdea[]> {
  const { data, error } = await supabase
    .from("gift_ideas")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list gift ideas: ${error.message}`);
  return (data as GiftIdeaRow[]).map(toGiftIdea);
}

export async function listGiftIdeasForPerson(personId: string): Promise<GiftIdea[]> {
  const { data, error } = await supabase
    .from("gift_ideas")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list gift ideas: ${error.message}`);
  return (data as GiftIdeaRow[]).map(toGiftIdea);
}

export async function createGiftIdea(userId: string, input: GiftIdeaInput): Promise<GiftIdea> {
  const parsed = giftIdeaInputSchema.parse(input);
  const { data, error } = await supabase
    .from("gift_ideas")
    .insert({
      circle_id: parsed.circleId,
      person_id: parsed.personId,
      created_by_user_id: userId,
      title: parsed.title,
      description: blankToNull(parsed.description),
      occasion: blankToNull(parsed.occasion),
      budget_amount: parsed.budgetAmount,
      budget_currency: parsed.budgetCurrency,
      deadline_at: blankToNull(parsed.deadlineAt),
      link_url: blankToNull(parsed.linkUrl),
      status: "idea",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save gift idea: ${error.message}`);
  return toGiftIdea(data as GiftIdeaRow);
}

export async function setGiftIdeaStatus(giftIdeaId: string, status: GiftIdeaStatus): Promise<void> {
  const { error } = await supabase.from("gift_ideas").update({ status }).eq("id", giftIdeaId);
  if (error) throw new Error(`Failed to update gift: ${error.message}`);
}

export async function claimGiftIdea(giftIdeaId: string, userId: string | null): Promise<void> {
  const { error } = await supabase
    .from("gift_ideas")
    .update({ claimed_by_user_id: userId })
    .eq("id", giftIdeaId);
  if (error) throw new Error(`Failed to update gift: ${error.message}`);
}
