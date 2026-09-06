import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Stage 9 hardening: `outbox_jobs` and `notification_deliveries` had no
 * retention policy at all — every terminal-state row accumulates forever.
 * `outbox_jobs` is purely internal (nothing reads a `succeeded`/
 * `dead_letter` row again once it's done), so it gets a short window.
 * `notification_deliveries` backs the account's own delivery-history UI
 * (`NotificationDeliveryList`), so its terminal rows (`sent`/`failed`/
 * `cancelled`; `scheduled` is still awaiting delivery and never purged)
 * are kept much longer. Both windows are technical defaults, not numbers
 * anyone has validated against real usage — see docs/integrations.md's
 * "Acceptance budgets" convention for the same caveat elsewhere.
 */
export const DEFAULT_OUTBOX_JOB_RETENTION_DAYS = 30;
export const DEFAULT_NOTIFICATION_DELIVERY_RETENTION_DAYS = 365;

export interface PurgeResult {
  outboxJobsDeleted: number;
  notificationDeliveriesDeleted: number;
}

export async function purgeOldRecords(
  client: SupabaseClient,
  now: Date = new Date(),
  outboxJobRetentionDays: number = DEFAULT_OUTBOX_JOB_RETENTION_DAYS,
  notificationDeliveryRetentionDays: number = DEFAULT_NOTIFICATION_DELIVERY_RETENTION_DAYS,
): Promise<PurgeResult> {
  const outboxCutoff = new Date(
    now.getTime() - outboxJobRetentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const notificationCutoff = new Date(
    now.getTime() - notificationDeliveryRetentionDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: purgedOutboxJobs, error: outboxError } = await client
    .from("outbox_jobs")
    .delete()
    .in("status", ["succeeded", "dead_letter"])
    .lt("updated_at", outboxCutoff)
    .select("id");
  if (outboxError) {
    throw new Error(`Failed to purge old outbox_jobs: ${outboxError.message}`);
  }

  const { data: purgedDeliveries, error: notificationError } = await client
    .from("notification_deliveries")
    .delete()
    .in("status", ["sent", "failed", "cancelled"])
    .lt("updated_at", notificationCutoff)
    .select("id");
  if (notificationError) {
    throw new Error(
      `Failed to purge old notification_deliveries: ${notificationError.message}`,
    );
  }

  return {
    outboxJobsDeleted: purgedOutboxJobs?.length ?? 0,
    notificationDeliveriesDeleted: purgedDeliveries?.length ?? 0,
  };
}
