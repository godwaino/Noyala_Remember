import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ImportantDate } from "@noyala/domain";
import { toImportantDate, type ImportantDateRow } from "./mappers";

export async function listImportantDatesForPerson(
  client: SupabaseClient,
  personId: string,
): Promise<ImportantDate[]> {
  const { data, error } = await client
    .from("important_dates")
    .select("*")
    .eq("person_id", personId)
    .order("month", { ascending: true })
    .order("day", { ascending: true });
  if (error) throw new Error(`Failed to list important dates: ${error.message}`);
  return (data as ImportantDateRow[]).map(toImportantDate);
}

export async function getImportantDate(
  client: SupabaseClient,
  id: string,
): Promise<ImportantDate | null> {
  const { data, error } = await client
    .from("important_dates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load important date: ${error.message}`);
  return data ? toImportantDate(data as ImportantDateRow) : null;
}

export interface ImportantDateWithPerson {
  date: ImportantDate;
  personFirstName: string;
}

/** Every important date for the signed-in user's non-archived people. */
export async function listUpcomingDatesForUser(
  client: SupabaseClient,
): Promise<ImportantDateWithPerson[]> {
  const { data, error } = await client
    .from("important_dates")
    .select("*, people!inner(first_name, archived_at)")
    .is("people.archived_at", null);
  if (error) throw new Error(`Failed to list upcoming dates: ${error.message}`);

  return (data as (ImportantDateRow & { people: { first_name: string } })[]).map((row) => ({
    date: toImportantDate(row),
    personFirstName: row.people.first_name,
  }));
}

/** Every important date for every person the user owns, archived or not — for data export. */
export async function listAllImportantDatesForUser(
  client: SupabaseClient,
): Promise<ImportantDateWithPerson[]> {
  const { data, error } = await client.from("important_dates").select("*, people(first_name)");
  if (error) throw new Error(`Failed to export important dates: ${error.message}`);

  return (data as (ImportantDateRow & { people: { first_name: string } })[]).map((row) => ({
    date: toImportantDate(row),
    personFirstName: row.people.first_name,
  }));
}
