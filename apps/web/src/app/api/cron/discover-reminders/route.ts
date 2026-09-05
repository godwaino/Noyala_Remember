import { NextResponse, type NextRequest } from "next/server";
import { discoverReminders, type ReminderSourceDate } from "@noyala/domain";
import { requireCronSecret } from "@/server/cron/require-cron-secret";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { createPostgresOutboxStore } from "@/server/outbox/postgres-outbox";
import { logger } from "@/server/logger";

interface ImportantDateRow {
  id: string;
  user_id: string;
  month: number;
  day: number;
  year: number | null;
  recurs_annually: boolean;
  timezone: string;
  reminder_offsets: number[];
}

/**
 * Meant to run on a schedule (see vercel.json) — finds every important
 * date whose reminder window is exactly "now" and creates a
 * `notification_deliveries` row + outbox job for each, both keyed by the
 * same deterministic dedup key so running this twice in the same window
 * is a safe no-op.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const serviceRole = getSupabaseServiceRoleClient();

  const { data: rows, error } = await serviceRole
    .from("important_dates")
    .select("*, people!inner(archived_at)")
    .is("people.archived_at", null);

  if (error) {
    logger.error("Reminder discovery: failed to load important_dates", { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sourceDates: ReminderSourceDate[] = (rows as ImportantDateRow[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    month: row.month,
    day: row.day,
    year: row.year,
    recursAnnually: row.recurs_annually,
    timezone: row.timezone,
    reminderOffsets: row.reminder_offsets,
  }));

  const candidates = discoverReminders(sourceDates, new Date());

  if (candidates.length === 0) {
    return NextResponse.json({ scheduled: 0 });
  }

  const userIds = [...new Set(candidates.map((c) => c.userId))];
  const { data: profiles, error: profilesError } = await serviceRole
    .from("profiles")
    .select("user_id, preferred_reminder_channel")
    .in("user_id", userIds);
  if (profilesError) {
    logger.error("Reminder discovery: failed to load profiles", { error: profilesError.message });
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }
  const channelByUser = new Map((profiles ?? []).map((p) => [p.user_id, p.preferred_reminder_channel]));

  const outboxStore = createPostgresOutboxStore(serviceRole);
  let scheduled = 0;

  for (const candidate of candidates) {
    const channel = channelByUser.get(candidate.userId) ?? "email";

    const { error: upsertError } = await serviceRole.from("notification_deliveries").upsert(
      {
        user_id: candidate.userId,
        important_date_id: candidate.importantDateId,
        scheduled_for: new Date().toISOString(),
        channel,
        deduplication_key: candidate.deduplicationKey,
      },
      { onConflict: "deduplication_key", ignoreDuplicates: true },
    );
    if (upsertError) {
      logger.error("Reminder discovery: failed to upsert notification_delivery", {
        error: upsertError.message,
        deduplicationKey: candidate.deduplicationKey,
      });
      continue;
    }

    await outboxStore.enqueue({
      type: "reminder.deliver",
      payload: { deduplicationKey: candidate.deduplicationKey },
      deduplicationKey: candidate.deduplicationKey,
    });
    scheduled++;
  }

  return NextResponse.json({ scheduled });
}
