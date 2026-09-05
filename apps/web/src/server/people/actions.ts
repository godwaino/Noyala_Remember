"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { personInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { blankToNull } from "./mappers";

export interface PersonFormState {
  status: "idle" | "error";
  message?: string;
}

function parsePersonForm(formData: FormData) {
  const cadenceRaw = formData.get("reconnectCadenceDays");
  return personInputSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    nickname: formData.get("nickname") || undefined,
    relationshipType: formData.get("relationshipType"),
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    pronouns: formData.get("pronouns") || undefined,
    notes: formData.get("notes") || undefined,
    reconnectCadenceDays: cadenceRaw && String(cadenceRaw).trim() !== "" ? Number(cadenceRaw) : null,
  });
}

export async function createPerson(
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = parsePersonForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: user.id,
      first_name: parsed.data.firstName,
      last_name: blankToNull(parsed.data.lastName),
      nickname: blankToNull(parsed.data.nickname),
      relationship_type: parsed.data.relationshipType,
      phone: blankToNull(parsed.data.phone),
      email: blankToNull(parsed.data.email),
      pronouns: blankToNull(parsed.data.pronouns),
      notes: blankToNull(parsed.data.notes),
      reconnect_cadence_days: parsed.data.reconnectCadenceDays,
    })
    .select("id")
    .single();

  if (error || !data) {
    reportError(error, { action: "createPerson" });
    return { status: "error", message: error?.message ?? "Could not save this person." };
  }

  revalidatePath("/people");
  redirect(`/people/${data.id}`);
}

export async function updatePerson(
  personId: string,
  _prevState: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const parsed = parsePersonForm(formData);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({
      first_name: parsed.data.firstName,
      last_name: blankToNull(parsed.data.lastName),
      nickname: blankToNull(parsed.data.nickname),
      relationship_type: parsed.data.relationshipType,
      phone: blankToNull(parsed.data.phone),
      email: blankToNull(parsed.data.email),
      pronouns: blankToNull(parsed.data.pronouns),
      notes: blankToNull(parsed.data.notes),
      reconnect_cadence_days: parsed.data.reconnectCadenceDays,
    })
    .eq("id", personId);

  if (error) {
    reportError(error, { action: "updatePerson", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
  redirect(`/people/${personId}`);
}

export async function archivePerson(personId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", personId);
  if (error) reportError(error, { action: "archivePerson", personId });
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

export async function restorePerson(personId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({ archived_at: null })
    .eq("id", personId);
  if (error) reportError(error, { action: "restorePerson", personId });
  revalidatePath("/people");
  revalidatePath(`/people/${personId}`);
}

/** Snooze control for reconnect suggestions (Master Build Prompt §4).
 * `days` is how many days from now to stay quiet — a plain date, no
 * penalty or counter of any kind. */
export async function snoozeReconnect(personId: string, days: number): Promise<void> {
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("people")
    .update({ reconnect_snoozed_until: until.toISOString().slice(0, 10) })
    .eq("id", personId);
  if (error) reportError(error, { action: "snoozeReconnect", personId });
  revalidatePath("/");
}

export async function deletePerson(personId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("people").delete().eq("id", personId);
  if (error) {
    reportError(error, { action: "deletePerson", personId });
    return;
  }
  revalidatePath("/people");
  redirect("/people");
}
