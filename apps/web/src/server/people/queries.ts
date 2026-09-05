import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Person, RelationshipType } from "@noyala/domain";
import { toPerson, type PersonRow } from "./mappers";

export interface ListPeopleFilters {
  search?: string;
  relationshipType?: RelationshipType;
  includeArchived?: boolean;
}

/**
 * RLS scopes this to the caller's own people automatically — `client` must
 * be a session-bound client (getSupabaseServerClient), never the
 * service-role client, for this to mean anything.
 */
export async function listPeople(
  client: SupabaseClient,
  filters: ListPeopleFilters = {},
): Promise<Person[]> {
  let query = client.from("people").select("*");

  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.relationshipType) {
    query = query.eq("relationship_type", filters.relationshipType);
  }
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

export async function getPerson(client: SupabaseClient, id: string): Promise<Person | null> {
  const { data, error } = await client.from("people").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load person: ${error.message}`);
  return data ? toPerson(data as PersonRow) : null;
}
