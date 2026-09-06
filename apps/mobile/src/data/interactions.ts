import type { FollowUp, Interaction } from "@noyala/domain";
import { followUpInputSchema, interactionInputSchema } from "@noyala/domain";
import type { FollowUpInput, InteractionInput } from "@noyala/domain";
import { supabase } from "./client";
import { blankToNull, toFollowUp, toInteraction, type FollowUpRow, type InteractionRow } from "./mappers";

export async function listInteractionsForPerson(personId: string): Promise<Interaction[]> {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("person_id", personId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`Failed to list interactions: ${error.message}`);
  return (data as InteractionRow[]).map(toInteraction);
}

/** Most recent interaction per person, for the whole user — used to
 * compute reconnect suggestions on Home. Mirrors
 * apps/web/src/server/interactions/queries.ts's listLastInteractionByPerson. */
export async function listLastInteractionByPerson(
  userId: string,
): Promise<Map<string, Interaction>> {
  const { data, error } = await supabase
    .from("interactions")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(`Failed to list interactions: ${error.message}`);
  const byPerson = new Map<string, Interaction>();
  for (const row of data as InteractionRow[]) {
    const interaction = toInteraction(row);
    if (!byPerson.has(interaction.personId)) byPerson.set(interaction.personId, interaction);
  }
  return byPerson;
}

export async function logInteraction(
  userId: string,
  personId: string,
  input: InteractionInput,
): Promise<Interaction> {
  const parsed = interactionInputSchema.parse(input);
  const { data, error } = await supabase
    .from("interactions")
    .insert({
      user_id: userId,
      person_id: personId,
      type: parsed.type,
      occurred_at: parsed.occurredAt,
      summary: blankToNull(parsed.summary),
      source: "manual",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to log connection: ${error.message}`);
  return toInteraction(data as InteractionRow);
}

export async function listFollowUpsForPerson(personId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("person_id", personId)
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to list follow-ups: ${error.message}`);
  return (data as FollowUpRow[]).map(toFollowUp);
}

export interface OpenFollowUp {
  followUp: FollowUp;
  personId: string;
}

export async function listOpenFollowUps(userId: string): Promise<FollowUp[]> {
  const { data, error } = await supabase
    .from("follow_ups")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to list follow-ups: ${error.message}`);
  return (data as FollowUpRow[]).map(toFollowUp);
}

export async function createFollowUp(
  userId: string,
  personId: string,
  input: FollowUpInput,
  interactionId: string | null = null,
): Promise<FollowUp> {
  const parsed = followUpInputSchema.parse(input);
  const { data, error } = await supabase
    .from("follow_ups")
    .insert({
      user_id: userId,
      person_id: personId,
      interaction_id: interactionId,
      description: parsed.description,
      due_at: blankToNull(parsed.dueAt),
      status: "open",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save follow-up: ${error.message}`);
  return toFollowUp(data as FollowUpRow);
}

export async function setFollowUpStatus(
  followUpId: string,
  status: "completed" | "dismissed",
): Promise<void> {
  const { error } = await supabase.from("follow_ups").update({ status }).eq("id", followUpId);
  if (error) throw new Error(`Failed to update follow-up: ${error.message}`);
}
