import { onboardingInputSchema, type OnboardingInput } from "@noyala/domain";
import type { Consent, ConsentType, Profile, ReminderChannel } from "@noyala/domain";
import { supabase, callMobileApi } from "./client";
import { toConsent, toProfile, type ConsentRow, type ProfileRow } from "./mappers";

export async function getProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<Profile> {
  const parsed = onboardingInputSchema.parse(input);
  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      user_id: userId,
      display_name: parsed.displayName,
      timezone: parsed.timezone,
      locale: parsed.locale,
      default_tone: parsed.defaultTone,
      default_reminder_offsets: parsed.defaultReminderOffsets,
      preferred_reminder_channel: parsed.preferredReminderChannel,
      onboarding_completed_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toProfile(data as ProfileRow);
}

export async function updateNotificationPreferences(
  preferredReminderChannel: ReminderChannel,
  defaultReminderOffsets: number[],
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_reminder_channel: preferredReminderChannel,
      default_reminder_offsets: defaultReminderOffsets,
    })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
}

export async function listConsents(userId: string): Promise<Consent[]> {
  const { data, error } = await supabase.from("consents").select("*").eq("user_id", userId);
  if (error) throw new Error(`Failed to load consents: ${error.message}`);
  return (data as ConsentRow[]).map(toConsent);
}

export async function grantConsent(userId: string, consentType: ConsentType): Promise<void> {
  const { error } = await supabase
    .from("consents")
    .upsert(
      { user_id: userId, consent_type: consentType, granted_at: new Date().toISOString(), withdrawn_at: null },
      { onConflict: "user_id,consent_type" },
    );
  if (error) throw new Error(error.message);
}

export async function withdrawConsent(consentId: string): Promise<void> {
  const { error } = await supabase
    .from("consents")
    .update({ withdrawn_at: new Date().toISOString() })
    .eq("id", consentId);
  if (error) throw new Error(error.message);
}

/**
 * Regular users can't delete their own auth.users row directly — this
 * needs the Admin API with the service-role key, so it goes through
 * apps/web's bearer-token route (mirrors apps/web/src/server/account/actions.ts
 * exactly). Immediate and permanent, matching the web app's real
 * behaviour: there is no `deletion_requested_at` column or 30-day grace
 * period in this schema today, so this app's copy says so plainly rather
 * than promising a grace period the backend can't honour.
 */
export async function deleteAccount(): Promise<void> {
  await callMobileApi<{ ok: true }>("/api/mobile/account/delete");
  await supabase.auth.signOut();
}
