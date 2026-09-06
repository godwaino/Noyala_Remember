import type { Circle, CircleInvitation, CircleMember, PersonShare } from "@noyala/domain";
import {
  circleInputSchema,
  circleInvitationInputSchema,
  personShareInputSchema,
  type CircleInput,
  type CircleInvitationInput,
  type PersonShareInput,
} from "@noyala/domain";
import { supabase } from "./client";
import {
  toCircle,
  toCircleInvitation,
  toCircleMember,
  toPersonShare,
  type CircleInvitationRow,
  type CircleMemberRow,
  type CircleRow,
  type PersonShareRow,
} from "./mappers";

export async function listMyCircles(): Promise<Circle[]> {
  const { data, error } = await supabase.from("circles").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list circles: ${error.message}`);
  return (data as CircleRow[]).map(toCircle);
}

export async function getCircle(circleId: string): Promise<Circle | null> {
  const { data, error } = await supabase.from("circles").select("*").eq("id", circleId).maybeSingle();
  if (error) throw new Error(`Failed to load circle: ${error.message}`);
  return data ? toCircle(data as CircleRow) : null;
}

export async function listCircleMembers(circleId: string): Promise<CircleMember[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list members: ${error.message}`);
  return (data as CircleMemberRow[]).map(toCircleMember);
}

export async function getMyMembership(circleId: string, userId: string): Promise<CircleMember | null> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load membership: ${error.message}`);
  return data ? toCircleMember(data as CircleMemberRow) : null;
}

export async function listCircleInvitations(circleId: string): Promise<CircleInvitation[]> {
  const { data, error } = await supabase
    .from("circle_invitations")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list invitations: ${error.message}`);
  return (data as CircleInvitationRow[]).map(toCircleInvitation);
}

export async function listMyPendingInvitations(userEmail: string): Promise<CircleInvitation[]> {
  const { data, error } = await supabase
    .from("circle_invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("invited_email", userEmail.replace(/[%_\\]/g, (c) => `\\${c}`))
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list invitations: ${error.message}`);
  return (data as CircleInvitationRow[]).map(toCircleInvitation);
}

/** Circles the current user can share their own people into (owner or
 * organiser) — two plain queries, mirroring the web app's
 * listMyShareableCircles rather than a Postgrest embed. */
export async function listMyShareableCircles(userId: string): Promise<Circle[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", userId)
    .in("role", ["owner", "organiser"]);
  if (membershipError) throw new Error(`Failed to list shareable circles: ${membershipError.message}`);
  const circleIds = (memberships as { circle_id: string }[]).map((m) => m.circle_id);
  if (circleIds.length === 0) return [];
  const { data, error } = await supabase.from("circles").select("*").in("id", circleIds);
  if (error) throw new Error(`Failed to list shareable circles: ${error.message}`);
  return (data as CircleRow[]).map(toCircle);
}

export async function createCircle(userId: string, input: CircleInput): Promise<Circle> {
  const parsed = circleInputSchema.parse(input);
  const { data: circle, error: circleError } = await supabase
    .from("circles")
    .insert({ owner_user_id: userId, name: parsed.name })
    .select("*")
    .single();
  if (circleError || !circle) throw new Error(circleError?.message ?? "Could not create this circle.");
  const { error: memberError } = await supabase
    .from("circle_members")
    .insert({ circle_id: circle.id, user_id: userId, role: "owner" });
  if (memberError) throw new Error(memberError.message);
  return toCircle(circle as CircleRow);
}

export async function inviteToCircle(
  circleId: string,
  userId: string,
  input: CircleInvitationInput,
): Promise<void> {
  const parsed = circleInvitationInputSchema.parse(input);
  const { error } = await supabase.from("circle_invitations").insert({
    circle_id: circleId,
    invited_email: parsed.invitedEmail,
    invited_by_user_id: userId,
    role: parsed.role,
  });
  if (error) {
    throw new Error(
      error.code === "23505" ? "There's already a pending invitation for that email." : error.message,
    );
  }
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("circle_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId);
  if (error) throw new Error(error.message);
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const { error } = await supabase
    .from("circle_invitations")
    .update({ status: "declined" })
    .eq("id", invitationId);
  if (error) throw new Error(error.message);
}

export async function acceptInvitation(token: string): Promise<void> {
  const { error } = await supabase.rpc("accept_circle_invitation", { invitation_token: token });
  if (error) throw new Error(error.message);
}

export async function leaveCircle(circleId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("circle_members")
    .delete()
    .eq("circle_id", circleId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from("circle_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function setLinkedPerson(
  circleId: string,
  userId: string,
  personId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("circle_members")
    .update({ linked_person_id: personId })
    .eq("circle_id", circleId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

// --- Person sharing --------------------------------------------------------

export async function listSharesForPerson(personId: string): Promise<PersonShare[]> {
  const { data, error } = await supabase
    .from("person_shares")
    .select("*")
    .eq("person_id", personId)
    .is("revoked_at", null);
  if (error) throw new Error(`Failed to list shares: ${error.message}`);
  return (data as PersonShareRow[]).map(toPersonShare);
}

export async function sharePersonWithCircle(userId: string, input: PersonShareInput): Promise<void> {
  const parsed = personShareInputSchema.parse(input);
  const { error } = await supabase.from("person_shares").insert({
    owner_user_id: userId,
    person_id: parsed.personId,
    circle_id: parsed.circleId,
    share_memories: parsed.shareMemories,
    share_gift_planning: parsed.shareGiftPlanning,
  });
  if (error) {
    throw new Error(
      error.code === "23505" ? "This person is already shared with that circle." : error.message,
    );
  }
}

export async function updateShareFlags(
  shareId: string,
  flags: { shareMemories: boolean; shareGiftPlanning: boolean },
): Promise<void> {
  const { error } = await supabase
    .from("person_shares")
    .update({ share_memories: flags.shareMemories, share_gift_planning: flags.shareGiftPlanning })
    .eq("id", shareId);
  if (error) throw new Error(error.message);
}

export async function revokeShare(shareId: string): Promise<void> {
  const { error } = await supabase
    .from("person_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", shareId);
  if (error) throw new Error(error.message);
}
