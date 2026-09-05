"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { personShareInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface PersonShareFormState {
  status: "idle" | "error";
  message?: string;
}

export async function sharePersonWithCircle(
  personId: string,
  _prevState: PersonShareFormState,
  formData: FormData,
): Promise<PersonShareFormState> {
  const parsed = personShareInputSchema.safeParse({
    personId,
    circleId: formData.get("circleId"),
    shareMemories: formData.get("shareMemories") === "on",
    shareGiftPlanning: formData.get("shareGiftPlanning") === "on",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("person_shares").insert({
    owner_user_id: user.id,
    person_id: parsed.data.personId,
    circle_id: parsed.data.circleId,
    share_memories: parsed.data.shareMemories,
    share_gift_planning: parsed.data.shareGiftPlanning,
  });

  if (error) {
    reportError(error, { action: "sharePersonWithCircle", personId });
    const message = error.code === "23505"
      ? "This person is already shared with that circle."
      : error.message;
    return { status: "error", message };
  }

  revalidatePath(`/people/${personId}`);
  return { status: "idle" };
}

export async function updateShareFlags(
  shareId: string,
  personId: string,
  flags: { shareMemories: boolean; shareGiftPlanning: boolean },
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("person_shares")
    .update({ share_memories: flags.shareMemories, share_gift_planning: flags.shareGiftPlanning })
    .eq("id", shareId);
  if (error) reportError(error, { action: "updateShareFlags", shareId });
  revalidatePath(`/people/${personId}`);
}

export async function revokeShare(shareId: string, personId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("person_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId);
  if (error) reportError(error, { action: "revokeShare", shareId });
  revalidatePath(`/people/${personId}`);
}
