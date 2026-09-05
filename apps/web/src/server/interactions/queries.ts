import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Interaction } from "@noyala/domain";
import { toInteraction, type InteractionRow } from "./mappers";

export async function listInteractionsForPerson(
  client: SupabaseClient,
  personId: string,
  limit = 20,
): Promise<Interaction[]> {
  const { data, error } = await client
    .from("interactions")
    .select("*")
    .eq("person_id", personId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list interactions: ${error.message}`);
  return (data as InteractionRow[]).map(toInteraction);
}

/** Most recent interaction per person, for reconnect-cadence calculations —
 * one query rather than N. */
export async function listLastInteractionByPerson(
  client: SupabaseClient,
): Promise<Map<string, Interaction>> {
  const { data, error } = await client
    .from("interactions")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`Failed to list interactions: ${error.message}`);

  const byPerson = new Map<string, Interaction>();
  for (const row of data as InteractionRow[]) {
    if (!byPerson.has(row.person_id)) byPerson.set(row.person_id, toInteraction(row));
  }
  return byPerson;
}
