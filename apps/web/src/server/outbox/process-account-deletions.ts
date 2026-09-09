import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/server/logger";

export interface ProcessAccountDeletionsResult {
  erased: number;
  failed: number;
}

/**
 * The actual, irreversible half of account deletion — see
 * src/server/account/actions.ts for the request/cancel side, and
 * supabase/migrations/20260907000100_account_deletion_requests.sql for
 * why a pending row past its erase_after is the only thing this looks for.
 *
 * `client` must be the service-role client: regular users can't delete
 * their own auth.users row directly (see the comment this replaced in
 * account/actions.ts), and this runs with nobody signed in — it's invoked
 * from the cron route, not from a request a user made.
 *
 * Deleting auth.users cascades to every table that references it (people,
 * profiles, consents, account_deletion_requests itself, …) — see the ON
 * DELETE CASCADE constraints across supabase/migrations. One failure
 * doesn't stop the run: a row that fails to erase simply stays `pending`
 * and is retried on the next run, same shape as the outbox's own
 * per-job try/catch in process-outbox/route.ts.
 */
export async function processAccountDeletions(
  client: SupabaseClient,
  now: Date = new Date(),
): Promise<ProcessAccountDeletionsResult> {
  const { data: due, error } = await client
    .from("account_deletion_requests")
    .select("user_id")
    .eq("status", "pending")
    .lte("erase_after", now.toISOString());

  if (error) {
    throw new Error(`Failed to list due account deletions: ${error.message}`);
  }

  let erased = 0;
  let failed = 0;

  for (const row of (due ?? []) as { user_id: string }[]) {
    try {
      const { error: deleteError } = await client.auth.admin.deleteUser(row.user_id);
      if (deleteError) throw deleteError;
      erased++;
    } catch (deleteError) {
      failed++;
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      logger.error("Account deletion failed; leaving request pending for retry", {
        userId: row.user_id,
        error: message,
      });
    }
  }

  return { erased, failed };
}
