"use server";

import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface SavePushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface SavePushSubscriptionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function savePushSubscription(
  input: SavePushSubscriptionInput,
): Promise<SavePushSubscriptionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Not signed in." };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "endpoint" },
  );

  if (error) {
    reportError(error, { action: "savePushSubscription" });
    return { status: "error", message: "Couldn't save your push subscription." };
  }

  return { status: "success" };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) reportError(error, { action: "removePushSubscription" });
}
