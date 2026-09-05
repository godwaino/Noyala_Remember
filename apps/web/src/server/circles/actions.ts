"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { circleInputSchema, circleInvitationInputSchema } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface CircleFormState {
  status: "idle" | "error";
  message?: string;
}

/**
 * Creates the circle, then its owner circle_members row, as two sequential
 * inserts (no client-side multi-statement transactions over PostgREST).
 * If the second insert fails, the circle is still visible to its owner
 * (circles_select_owner doesn't require a membership row) so nothing is
 * orphaned out of view; the owner-membership insert is idempotent to
 * retry.
 */
export async function createCircle(
  _prevState: CircleFormState,
  formData: FormData,
): Promise<CircleFormState> {
  const parsed = circleInputSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .insert({ owner_user_id: user.id, name: parsed.data.name })
    .select("id")
    .single();

  if (circleError || !circle) {
    reportError(circleError, { action: "createCircle" });
    return { status: "error", message: circleError?.message ?? "Could not create this circle." };
  }

  const { error: memberError } = await supabase
    .from("circle_members")
    .insert({ circle_id: circle.id, user_id: user.id, role: "owner" });

  if (memberError) {
    reportError(memberError, { action: "createCircle.ownerMembership", circleId: circle.id });
  }

  revalidatePath("/circles");
  redirect(`/circles/${circle.id}`);
}

export async function inviteToCircle(
  circleId: string,
  _prevState: CircleFormState,
  formData: FormData,
): Promise<CircleFormState> {
  const parsed = circleInvitationInputSchema.safeParse({
    invitedEmail: formData.get("invitedEmail"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("circle_invitations").insert({
    circle_id: circleId,
    invited_email: parsed.data.invitedEmail,
    invited_by_user_id: user.id,
    role: parsed.data.role,
  });

  if (error) {
    reportError(error, { action: "inviteToCircle", circleId });
    // The partial unique index (one pending invite per circle/email) is
    // the most likely real-world failure here — surface it plainly.
    const message = error.code === "23505"
      ? "There's already a pending invitation for that email."
      : error.message;
    return { status: "error", message };
  }

  revalidatePath(`/circles/${circleId}`);
  return { status: "idle" };
}

export async function revokeInvitation(circleId: string, invitationId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("circle_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  if (error) reportError(error, { action: "revokeInvitation", invitationId });
  revalidatePath(`/circles/${circleId}`);
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from("circle_invitations")
    .update({ status: "declined" })
    .eq("id", invitationId);
  if (error) reportError(error, { action: "declineInvitation", invitationId });
  revalidatePath("/circles");
}

export async function acceptInvitation(
  token: string,
  _prevState: CircleFormState,
): Promise<CircleFormState> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc("accept_circle_invitation", { invitation_token: token });
  if (error) {
    reportError(error, { action: "acceptInvitation" });
    return { status: "error", message: error.message };
  }
  revalidatePath("/circles");
  return { status: "idle" };
}

export async function leaveCircle(circleId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", user.id);
  if (error) reportError(error, { action: "leaveCircle", circleId });
  revalidatePath("/circles");
  redirect("/circles");
}

export async function removeMember(circleId: string, memberId: string): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from("circle_members").delete().eq("id", memberId);
  if (error) reportError(error, { action: "removeMember", circleId, memberId });
  revalidatePath(`/circles/${circleId}`);
}

/** Self-identification for surprise-gift hiding: "this person record is
 * me" — see circle_members.linked_person_id. Pass null to clear it. */
export async function setLinkedPerson(
  circleId: string,
  personId: string | null,
): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("circle_members")
    .update({ linked_person_id: personId })
    .eq("circle_id", circleId)
    .eq("user_id", user.id);
  if (error) reportError(error, { action: "setLinkedPerson", circleId });
  revalidatePath(`/circles/${circleId}`);
}
