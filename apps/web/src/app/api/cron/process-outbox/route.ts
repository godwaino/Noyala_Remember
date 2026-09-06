import { NextResponse, type NextRequest } from "next/server";
import { computeRetryDelayMs } from "@noyala/domain";
import { requireCronSecret } from "@/server/cron/require-cron-secret";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { createPostgresOutboxStore } from "@/server/outbox/postgres-outbox";
import { processReminderJob, type ReminderJobPayload } from "@/server/outbox/process-reminder-job";
import { purgeOldRecords } from "@/server/outbox/purge-old-records";
import { getEmailProvider } from "@/server/notifications/email-provider";
import { getPushProvider } from "@/server/notifications/push-provider";
import { logger } from "@/server/logger";

/** Bounded per invocation — serverless functions have a time limit, and an
 * unbounded loop here would let one slow run starve the next scheduled one. */
const MAX_JOBS_PER_RUN = 20;

export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const serviceRole = getSupabaseServiceRoleClient();
  const outboxStore = createPostgresOutboxStore(serviceRole);
  const emailProvider = getEmailProvider();
  const pushProvider = getPushProvider();

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const job = await outboxStore.claimNext("reminder.deliver");
    if (!job) break;
    processed++;

    try {
      await processReminderJob(
        serviceRole,
        emailProvider,
        pushProvider,
        job.payload as ReminderJobPayload,
      );
      await outboxStore.markSucceeded(job.id);
      succeeded++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error("reminder.deliver job failed", { jobId: job.id, error: message });
      await outboxStore.markFailed(job.id, message, computeRetryDelayMs(job.attemptCount));
      failed++;
    }
  }

  // Piggybacked on this existing daily cron rather than adding a third
  // Vercel cron entry for what's a cheap, idempotent, once-a-day-is-plenty
  // cleanup — see docs/decisions/0016-retention-purge-piggybacked-on-outbox-cron.md.
  let purged = { outboxJobsDeleted: 0, notificationDeliveriesDeleted: 0 };
  try {
    purged = await purgeOldRecords(serviceRole);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Retention purge failed", { error: message });
  }

  return NextResponse.json({ processed, succeeded, failed, purged });
}
