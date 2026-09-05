import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FollowUp } from "@noyala/domain";
import { toFollowUp, type FollowUpRow } from "./mappers";

export async function listOpenFollowUpsForPerson(
  client: SupabaseClient,
  personId: string,
): Promise<FollowUp[]> {
  const { data, error } = await client
    .from("follow_ups")
    .select("*")
    .eq("person_id", personId)
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(`Failed to list follow-ups: ${error.message}`);
  return (data as FollowUpRow[]).map(toFollowUp);
}

export interface FollowUpWithPerson {
  followUp: FollowUp;
  personFirstName: string;
}

/** Every open follow-up across the account, for the Home dashboard. */
export async function listOpenFollowUpsForUser(client: SupabaseClient): Promise<FollowUpWithPerson[]> {
  const { data, error } = await client
    .from("follow_ups")
    .select("*, people(first_name)")
    .eq("status", "open");
  if (error) throw new Error(`Failed to list follow-ups: ${error.message}`);

  return (data as (FollowUpRow & { people: { first_name: string } })[]).map((row) => ({
    followUp: toFollowUp(row),
    personFirstName: row.people.first_name,
  }));
}
