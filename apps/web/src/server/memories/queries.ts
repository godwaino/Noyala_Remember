import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Memory } from "@noyala/domain";
import { toMemory, type MemoryRow } from "./mappers";

export async function listMemoriesForPerson(
  client: SupabaseClient,
  personId: string,
  { includeArchived = false }: { includeArchived?: boolean } = {},
): Promise<Memory[]> {
  let query = client.from("memories").select("*").eq("person_id", personId);
  if (!includeArchived) query = query.is("archived_at", null);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list memories: ${error.message}`);
  return (data as MemoryRow[]).map(toMemory);
}

export async function getMemory(client: SupabaseClient, id: string): Promise<Memory | null> {
  const { data, error } = await client.from("memories").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load memory: ${error.message}`);
  return data ? toMemory(data as MemoryRow) : null;
}

export interface MemoryWithPerson {
  memory: Memory;
  personFirstName: string;
}

/** Every memory for every person the user owns, archived or not — for data export. */
export async function listAllMemoriesForUser(client: SupabaseClient): Promise<MemoryWithPerson[]> {
  const { data, error } = await client.from("memories").select("*, people(first_name)");
  if (error) throw new Error(`Failed to export memories: ${error.message}`);

  return (data as (MemoryRow & { people: { first_name: string } })[]).map((row) => ({
    memory: toMemory(row),
    personFirstName: row.people.first_name,
  }));
}
