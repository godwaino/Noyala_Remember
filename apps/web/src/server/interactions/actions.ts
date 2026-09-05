"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { interactionInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface InteractionFormState {
  status: "idle" | "error";
  message?: string;
}

export async function logInteraction(
  personId: string,
  _prevState: InteractionFormState,
  formData: FormData,
): Promise<InteractionFormState> {
  const parsed = interactionInputSchema.safeParse({
    type: formData.get("type"),
    occurredAt: formData.get("occurredAt"),
    summary: formData.get("summary") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("interactions").insert({
    user_id: user.id,
    person_id: personId,
    type: parsed.data.type,
    occurred_at: new Date(parsed.data.occurredAt).toISOString(),
    summary: parsed.data.summary || null,
    source: "manual",
  });

  if (error) {
    reportError(error, { action: "logInteraction", personId });
    return { status: "error", message: error.message };
  }

  revalidatePath(`/people/${personId}`);
  revalidatePath("/");
  redirect(`/people/${personId}`);
}

export async function deleteInteraction(personId: string, interactionId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("interactions").delete().eq("id", interactionId);
  if (error) reportError(error, { action: "deleteInteraction", interactionId });
  revalidatePath(`/people/${personId}`);
  revalidatePath("/");
}
