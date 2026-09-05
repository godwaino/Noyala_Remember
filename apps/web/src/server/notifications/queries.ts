import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface NotificationDeliveryRow {
  id: string;
  scheduled_for: string;
  channel: "email" | "push";
  status: "scheduled" | "sent" | "failed" | "cancelled";
  last_error: string | null;
  important_dates: { label: string; people: { first_name: string } | null } | null;
}

/** RLS ("select own") scopes this to the signed-in user automatically. */
export async function listNotificationDeliveries(
  client: SupabaseClient,
  limit = 50,
): Promise<NotificationDeliveryRow[]> {
  const { data, error } = await client
    .from("notification_deliveries")
    .select("id, scheduled_for, channel, status, last_error, important_dates(label, people(first_name))")
    .order("scheduled_for", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to list notification deliveries: ${error.message}`);
  return data as unknown as NotificationDeliveryRow[];
}
