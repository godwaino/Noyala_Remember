"use server";

import { redirect } from "next/navigation";
import { onboardingInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";

export interface OnboardingState {
  status: "idle" | "error";
  message?: string;
}

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const parsed = onboardingInputSchema.safeParse({
    displayName: formData.get("displayName"),
    timezone: formData.get("timezone"),
    locale: formData.get("locale") || undefined,
    defaultReminderOffsets: formData
      .getAll("reminderOffsets")
      .map((value) => Number(value)),
    preferredReminderChannel: formData.get("preferredReminderChannel"),
    defaultTone: formData.get("defaultTone"),
    acknowledgedMemoryUsage: formData.get("acknowledgedMemoryUsage") === "true",
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    display_name: parsed.data.displayName,
    timezone: parsed.data.timezone,
    locale: parsed.data.locale,
    default_tone: parsed.data.defaultTone,
    default_reminder_offsets: parsed.data.defaultReminderOffsets,
    preferred_reminder_channel: parsed.data.preferredReminderChannel,
    onboarding_completed_at: new Date().toISOString(),
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/");
}
