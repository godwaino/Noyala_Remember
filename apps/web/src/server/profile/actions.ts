"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface NotificationPreferencesState {
  status: "idle" | "success" | "error";
  message?: string;
}

const preferencesSchema = z.object({
  preferredReminderChannel: z.enum(["email", "push"]),
  defaultReminderOffsets: z
    .array(z.number().int().min(0).max(365))
    .min(1, "Choose at least one reminder offset"),
});

/**
 * The "notification preference centre" Master Build Prompt §10 calls for.
 * These fields were previously only ever set once, at onboarding — this is
 * the first place a signed-in user can change them afterward.
 */
export async function updateNotificationPreferences(
  _prevState: NotificationPreferencesState,
  formData: FormData,
): Promise<NotificationPreferencesState> {
  const parsed = preferencesSchema.safeParse({
    preferredReminderChannel: formData.get("preferredReminderChannel"),
    defaultReminderOffsets: formData.getAll("reminderOffsets").map((v) => Number(v)),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_reminder_channel: parsed.data.preferredReminderChannel,
      default_reminder_offsets: parsed.data.defaultReminderOffsets,
    })
    .eq("user_id", user.id);

  if (error) {
    reportError(error, { action: "updateNotificationPreferences" });
    return { status: "error", message: error.message };
  }

  revalidatePath("/settings");
  return { status: "success", message: "Preferences saved." };
}
