import type { Person, RelationshipType } from "@noyala/domain";
import { personInputSchema, type PersonInput } from "@noyala/domain";
import { supabase } from "./client";
import { blankToNull, toPerson, type PersonRow } from "./mappers";

export interface ListPeopleFilters {
  search?: string;
  relationshipType?: RelationshipType;
}

export async function listPeople(userId: string, filters: ListPeopleFilters = {}): Promise<Person[]> {
  let query = supabase.from("people").select("*").eq("user_id", userId).is("archived_at", null);
  if (filters.relationshipType) query = query.eq("relationship_type", filters.relationshipType);
  if (filters.search && filters.search.trim().length > 0) {
    const term = filters.search.trim().replace(/[%_]/g, "\\$&");
    query = query.or(
      `first_name.ilike.%${term}%,last_name.ilike.%${term}%,nickname.ilike.%${term}%`,
    );
  }
  const { data, error } = await query.order("first_name", { ascending: true });
  if (error) throw new Error(`Failed to list people: ${error.message}`);
  return (data as PersonRow[]).map(toPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase.from("people").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load person: ${error.message}`);
  return data ? toPerson(data as PersonRow) : null;
}

/** Validates with the same zod schema the web app's server action uses,
 * so a mobile-created person can never violate a rule the backend didn't
 * also get to check (RLS + this table's CHECK constraints are the real
 * enforcement; this is the honest, same-shaped client-side echo of it). */
export async function createPerson(userId: string, input: PersonInput): Promise<Person> {
  const parsed = personInputSchema.parse(input);
  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: userId,
      first_name: parsed.firstName,
      last_name: blankToNull(parsed.lastName),
      nickname: blankToNull(parsed.nickname),
      relationship_type: parsed.relationshipType,
      phone: blankToNull(parsed.phone),
      email: blankToNull(parsed.email),
      pronouns: blankToNull(parsed.pronouns),
      notes: blankToNull(parsed.notes),
      reconnect_cadence_days: parsed.reconnectCadenceDays,
      gift_preferences: blankToNull(parsed.giftPreferences),
      gift_exclusions: blankToNull(parsed.giftExclusions),
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save person: ${error.message}`);
  return toPerson(data as PersonRow);
}

export async function updatePersonCadence(
  personId: string,
  reconnectCadenceDays: number | null,
): Promise<void> {
  const { error } = await supabase
    .from("people")
    .update({ reconnect_cadence_days: reconnectCadenceDays })
    .eq("id", personId);
  if (error) throw new Error(`Failed to update cadence: ${error.message}`);
}

export async function snoozeReconnect(personId: string, snoozedUntilIso: string | null): Promise<void> {
  const { error } = await supabase
    .from("people")
    .update({ reconnect_snoozed_until: snoozedUntilIso })
    .eq("id", personId);
  if (error) throw new Error(`Failed to snooze: ${error.message}`);
}

export function initialsFor(person: Pick<Person, "firstName" | "lastName">): string {
  const first = person.firstName.trim().charAt(0);
  const last = (person.lastName ?? "").trim().charAt(0);
  return (first + last).toUpperCase() || "?";
}

export function displayName(person: Pick<Person, "firstName" | "nickname">): string {
  return person.nickname && person.nickname.trim().length > 0 ? person.nickname : person.firstName;
}
