import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@noyala/domain";

interface ProfileRow {
  user_id: string;
  display_name: string;
  timezone: string;
  locale: string;
  default_tone: Profile["defaultTone"];
  default_reminder_offsets: number[];
  preferred_reminder_channel: Profile["preferredReminderChannel"];
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    timezone: row.timezone,
    locale: row.locale,
    defaultTone: row.default_tone,
    defaultReminderOffsets: row.default_reminder_offsets,
    preferredReminderChannel: row.preferred_reminder_channel,
    onboardingCompletedAt: row.onboarding_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getProfile(client: SupabaseClient): Promise<Profile | null> {
  const { data, error } = await client.from("profiles").select("*").maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data ? toProfile(data as ProfileRow) : null;
}
