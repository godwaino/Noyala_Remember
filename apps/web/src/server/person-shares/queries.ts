import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonShare } from "@noyala/domain";
import { toPersonShare, type PersonShareRow } from "./mappers";

/** Active (not revoked) shares for a person, across every circle — for the
 * "shared with" section on the person detail page. */
export async function listActiveSharesForPerson(
  client: SupabaseClient,
  personId: string,
): Promise<PersonShare[]> {
  const { data, error } = await client
    .from("person_shares")
    .select("*")
    .eq("person_id", personId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list person shares: ${error.message}`);
  return (data as PersonShareRow[]).map(toPersonShare);
}

/** Active shares into a circle — for the circle detail page's "shared
 * people" list. */
export async function listActiveSharesForCircle(
  client: SupabaseClient,
  circleId: string,
): Promise<PersonShare[]> {
  const { data, error } = await client
    .from("person_shares")
    .select("*")
    .eq("circle_id", circleId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list person shares: ${error.message}`);
  return (data as PersonShareRow[]).map(toPersonShare);
}
