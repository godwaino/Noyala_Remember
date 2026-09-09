import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountDeletionRequest } from "@noyala/domain";
import { toAccountDeletionRequest, type AccountDeletionRequestRow } from "./mappers";

/** The signed-in user's own deletion request, if any — pending or
 * cancelled. RLS already scopes this to the caller's own row (the table's
 * primary key is user_id, so there is at most one). */
export async function getMyDeletionRequest(
  client: SupabaseClient,
): Promise<AccountDeletionRequest | null> {
  const { data, error } = await client
    .from("account_deletion_requests")
    .select("*")
    .maybeSingle();
  if (error) throw new Error(`Failed to load deletion request: ${error.message}`);
  return data ? toAccountDeletionRequest(data as AccountDeletionRequestRow) : null;
}
