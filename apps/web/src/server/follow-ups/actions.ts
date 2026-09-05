"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { followUpInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface FollowUpFormState {
  status: "idle" | "error";
  message?: string;
}

export async function createFollowUp(
  personId: string,
  _prevState: FollowUpFormState,
  formData: FormData,
): Promise<FollowUpFormState> {
  const parsed = followUpInputSchema.safeParse({
    description: formData.get("description"),
    dueAt: formData.get("dueAt") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("follow_ups").insert({
    user_id: user.id,
    person_id: personId,
    description: parsed.data.description,
    due_at: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
    status: "open",
  });

  if (error) {
    reportError(error, { action: "createFollowUp", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  revalidatePath("/");
  redirect(`/people/${personId}`);
}

async function setFollowUpStatus(
  personId: string,
  followUpId: string,
  status: "completed" | "dismissed",
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("follow_ups").update({ status }).eq("id", followUpId);
  if (error) reportError(error, { action: `followUp.${status}`, followUpId });
  revalidatePath(`/people/${personId}`);
  revalidatePath("/");
}

export async function completeFollowUp(personId: string, followUpId: string): Promise<void> {
  await setFollowUpStatus(personId, followUpId, "completed");
}

export async function dismissFollowUp(personId: string, followUpId: string): Promise<void> {
  await setFollowUpStatus(personId, followUpId, "dismissed");
}
