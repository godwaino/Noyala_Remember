import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { EmailProvider, WebPushProvider } from "@noyala/domain";
import { notificationSender } from "@noyala/brand";
import { logger } from "@/server/logger";

export interface ReminderJobPayload {
  deduplicationKey: string;
}

/**
 * Processes one "reminder.deliver" outbox job. Thrown errors are transient
 * — the caller (the outbox worker) retries them with backoff, eventually
 * dead-lettering per docs/decisions/0006-outbox-stale-processing-reclaim.md.
 * A *permanent* failure (bad address, expired push subscription, no
 * subscription at all) is handled here instead: mark the delivery
 * `failed` and return normally, since retrying it would never succeed.
 *
 * Known gap, documented rather than silently accepted: if an outbox job
 * itself gets dead-lettered (every retry was transient-failing), nothing
 * currently marks the corresponding `notification_deliveries` row
 * `failed` — it stays `scheduled` forever. Reconciling dead-lettered
 * reminder jobs is Stage 8 admin-console territory; tracked in
 * docs/roadmap.md rather than built here.
 */
export async function processReminderJob(
  serviceRole: SupabaseClient,
  emailProvider: EmailProvider,
  pushProvider: WebPushProvider,
  payload: ReminderJobPayload,
): Promise<void> {
  const { data: delivery, error: deliveryError } = await serviceRole
    .from("notification_deliveries")
    .select("id, user_id, important_date_id, channel, status")
    .eq("deduplication_key", payload.deduplicationKey)
    .maybeSingle();

  if (deliveryError) {
    throw new Error(`Failed to load notification_delivery: ${deliveryError.message}`);
  }
  if (!delivery) {
    // Nothing to do — most likely raced with a cancel-on-edit delete, or
    // this is a stale retry of a job whose row is genuinely gone.
    logger.info("Reminder job has no matching notification_delivery; skipping", {
      deduplicationKey: payload.deduplicationKey,
    });
    return;
  }
  if (delivery.status !== "scheduled") {
    // Already sent, failed or cancelled (e.g. the date was edited after
    // this job was enqueued) — idempotent no-op, not an error.
    return;
  }

  const { data: date, error: dateError } = await serviceRole
    .from("important_dates")
    .select("label, person_id")
    .eq("id", delivery.important_date_id)
    .single();
  if (dateError) throw new Error(`Failed to load important_date: ${dateError.message}`);

  const { data: person, error: personError } = await serviceRole
    .from("people")
    .select("first_name")
    .eq("id", date.person_id)
    .single();
  if (personError) throw new Error(`Failed to load person: ${personError.message}`);

  const subject = `${notificationSender.reminderSubjectPrefix}: ${date.label} for ${person.first_name}`;
  const body = `${date.label} for ${person.first_name} is coming up.`;

  if (delivery.channel === "email") {
    const { data: authUser, error: authError } = await serviceRole.auth.admin.getUserById(
      delivery.user_id,
    );
    if (authError || !authUser.user?.email) {
      await markDelivery(serviceRole, delivery.id, "failed", "User has no email on file");
      return;
    }

    const result = await emailProvider.sendEmail({ to: authUser.user.email, subject, body });
    if (result.delivered) {
      await markDelivery(serviceRole, delivery.id, "sent");
      return;
    }
    if (result.permanentFailure) {
      await markDelivery(serviceRole, delivery.id, "failed", "Email provider rejected the address");
      return;
    }
    throw new Error("Transient email delivery failure");
  }

  // channel === "push"
  const { data: subscriptions, error: subsError } = await serviceRole
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", delivery.user_id);
  if (subsError) throw new Error(`Failed to load push subscriptions: ${subsError.message}`);

  if (!subscriptions || subscriptions.length === 0) {
    await markDelivery(serviceRole, delivery.id, "failed", "No push subscription registered");
    return;
  }

  let anyDelivered = false;
  let anyTransientFailure = false;

  for (const sub of subscriptions) {
    const result = await pushProvider.sendPush({
      subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      title: subject,
      body,
      url: `/people/${date.person_id}`,
    });

    if (result.delivered) {
      anyDelivered = true;
    } else if (result.permanentFailure) {
      await serviceRole.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    } else {
      anyTransientFailure = true;
    }
  }

  if (anyDelivered) {
    await markDelivery(serviceRole, delivery.id, "sent");
    return;
  }
  if (anyTransientFailure) {
    throw new Error("Transient push delivery failure");
  }
  await markDelivery(serviceRole, delivery.id, "failed", "All push subscriptions were expired");
}

async function markDelivery(
  client: SupabaseClient,
  id: string,
  status: "sent" | "failed",
  lastError?: string,
): Promise<void> {
  const { error } = await client
    .from("notification_deliveries")
    .update({ status, last_error: lastError ?? null })
    .eq("id", id);
  if (error) {
    logger.error("Failed to update notification_delivery status", { id, status, error: error.message });
  }
}
