"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { importantDateInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface ImportantDateFormState {
  status: "idle" | "error";
  message?: string;
}

function parseImportantDateForm(formData: FormData) {
  const yearRaw = formData.get("year");
  return importantDateInputSchema.safeParse({
    type: formData.get("type"),
    label: formData.get("label"),
    month: Number(formData.get("month")),
    day: Number(formData.get("day")),
    year: yearRaw && String(yearRaw).trim() !== "" ? Number(yearRaw) : null,
    recursAnnually: formData.get("recursAnnually") === "true",
    reminderOffsets: formData
      .getAll("reminderOffsets")
      .map((v) => Number(v)),
    timezone: formData.get("timezone"),
  });
}

export async function createImportantDate(
  personId: string,
  _prevState: ImportantDateFormState,
  formData: FormData,
): Promise<ImportantDateFormState> {
  const parsed = parseImportantDateForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("important_dates").insert({
    user_id: user.id,
    person_id: personId,
    type: parsed.data.type,
    label: parsed.data.label,
    month: parsed.data.month,
    day: parsed.data.day,
    year: parsed.data.year,
    recurs_annually: parsed.data.recursAnnually,
    reminder_offsets: parsed.data.reminderOffsets,
    timezone: parsed.data.timezone,
  });

  if (error) {
    reportError(error, { action: "createImportantDate", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

export async function updateImportantDate(
  personId: string,
  dateId: string,
  _prevState: ImportantDateFormState,
  formData: FormData,
): Promise<ImportantDateFormState> {
  const parsed = parseImportantDateForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("important_dates")
    .update({
      type: parsed.data.type,
      label: parsed.data.label,
      month: parsed.data.month,
      day: parsed.data.day,
      year: parsed.data.year,
      recurs_annually: parsed.data.recursAnnually,
      reminder_offsets: parsed.data.reminderOffsets,
      timezone: parsed.data.timezone,
    })
    .eq("id", dateId);

  if (error) {
    reportError(error, { action: "updateImportantDate", dateId });
    return { status: "error", message: error.message };
  }

  await cancelScheduledDeliveries(dateId);

  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

/**
 * Per docs/state-transitions.md's downtime/edit decision: an edited date's
 * old computed occurrence is no longer valid, so any reminder still
 * `scheduled` against it is cancelled rather than left to fire against
 * stale data — the next reminder-discovery run recomputes and reschedules
 * fresh rows under new dedup keys. `notification_deliveries` has no
 * authenticated-write policy (Stage 1: only the service role writes it),
 * so this one narrow write goes through the service-role client.
 */
async function cancelScheduledDeliveries(importantDateId: string): Promise<void> {
  const serviceRole = getSupabaseServiceRoleClient();
  const { error } = await serviceRole
    .from("notification_deliveries")
    .update({ status: "cancelled" })
    .eq("important_date_id", importantDateId)
    .eq("status", "scheduled");
  if (error) reportError(error, { action: "cancelScheduledDeliveries", importantDateId });
}

export async function deleteImportantDate(personId: string, dateId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("important_dates").delete().eq("id", dateId);
  if (error) reportError(error, { action: "deleteImportantDate", dateId });
  revalidatePath(`/people/${personId}`);
}
