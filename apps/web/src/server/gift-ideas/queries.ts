import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GiftIdea } from "@noyala/domain";
import { toGiftIdea, type GiftIdeaRow } from "./mappers";

/**
 * Every gift idea for this person the current viewer is allowed to see.
 * RLS already does the real work here: it excludes ideas from a circle the
 * viewer isn't in, ideas whose share_gift_planning is off, and — always,
 * not optionally — any idea whose recipient is the viewer's own
 * linked_person_id (the surprise-hiding rule). Nothing extra to filter
 * client-side.
 */
export async function listGiftIdeasForPerson(
  client: SupabaseClient,
  personId: string,
): Promise<GiftIdea[]> {
  const { data, error } = await client
    .from("gift_ideas")
    .select("*")
    .eq("person_id", personId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list gift ideas: ${error.message}`);
  return (data as GiftIdeaRow[]).map(toGiftIdea);
}

/** Every gift idea across every circle/person the current viewer can see —
 * for the top-level /gifts overview. Same RLS guarantees as
 * listGiftIdeasForPerson, just not scoped to one person. */
export async function listMyVisibleGiftIdeas(client: SupabaseClient): Promise<GiftIdea[]> {
  const { data, error } = await client
    .from("gift_ideas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list gift ideas: ${error.message}`);
  return (data as GiftIdeaRow[]).map(toGiftIdea);
}
