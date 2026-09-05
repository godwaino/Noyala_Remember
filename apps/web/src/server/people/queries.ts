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
 * The caller's own people only — explicitly scoped by user_id, not left to
 * RLS alone. Since Stage 6, RLS also makes a *shared* person visible to
 * circle members (see person_shares_via_circle policies), which this list
 * must not include: "your people" and "people shared with you" are
 * different views (the latter lives on each circle's page instead).
 * `client` must be a session-bound client (getSupabaseServerClient), never
 * the service-role client.
 */
export async function listPeople(
  client: SupabaseClient,
  ownerUserId: string,
  filters: ListPeopleFilters = {},
): Promise<Person[]> {
  let query = client.from("people").select("*").eq("user_id", ownerUserId);

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
