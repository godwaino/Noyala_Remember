import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Circle, CircleInvitation, CircleMember } from "@noyala/domain";
import {
  toCircle,
  toCircleInvitation,
  toCircleMember,
  type CircleInvitationRow,
  type CircleMemberRow,
  type CircleRow,
} from "./mappers";

/** Every circle the current user can see — RLS already scopes this to
 * circles they own or are an accepted member of. */
export async function listMyCircles(client: SupabaseClient): Promise<Circle[]> {
  const { data, error } = await client
    .from("circles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list circles: ${error.message}`);
  return (data as CircleRow[]).map(toCircle);
}

export async function getCircle(client: SupabaseClient, circleId: string): Promise<Circle | null> {
  const { data, error } = await client
    .from("circles")
    .select("*")
    .eq("id", circleId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load circle: ${error.message}`);
  return data ? toCircle(data as CircleRow) : null;
}

export async function listCircleMembers(
  client: SupabaseClient,
  circleId: string,
): Promise<CircleMember[]> {
  const { data, error } = await client
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list circle members: ${error.message}`);
  return (data as CircleMemberRow[]).map(toCircleMember);
}

/** The current user's own membership row for a circle, or null if they
 * aren't a member (e.g. RLS hid the whole circle from them). */
export async function getMyMembership(
  client: SupabaseClient,
  circleId: string,
  userId: string,
): Promise<CircleMember | null> {
  const { data, error } = await client
    .from("circle_members")
    .select("*")
    .eq("circle_id", circleId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load membership: ${error.message}`);
  return data ? toCircleMember(data as CircleMemberRow) : null;
}

export async function listCircleInvitations(
  client: SupabaseClient,
  circleId: string,
): Promise<CircleInvitation[]> {
  const { data, error } = await client
    .from("circle_invitations")
    .select("*")
    .eq("circle_id", circleId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list invitations: ${error.message}`);
  return (data as CircleInvitationRow[]).map(toCircleInvitation);
}

export async function getCirclesByIds(client: SupabaseClient, ids: string[]): Promise<Circle[]> {
  if (ids.length === 0) return [];
  const { data, error } = await client.from("circles").select("*").in("id", ids);
  if (error) throw new Error(`Failed to load circles: ${error.message}`);
  return (data as CircleRow[]).map(toCircle);
}

/** Circles the current user can share one of their own people into —
 * i.e. where their role is owner or organiser (canShareOwnPerson). Two
 * plain queries rather than a nested embed, to avoid depending on
 * Postgrest's embed-shape inference without generated Database types. */
export async function listMyShareableCircles(
  client: SupabaseClient,
  userId: string,
): Promise<Circle[]> {
  const { data: memberships, error: membershipError } = await client
    .from("circle_members")
    .select("circle_id")
    .eq("user_id", userId)
    .in("role", ["owner", "organiser"]);
  if (membershipError) {
    throw new Error(`Failed to list shareable circles: ${membershipError.message}`);
  }

  const circleIds = (memberships as { circle_id: string }[]).map((m) => m.circle_id);
  if (circleIds.length === 0) return [];

  const { data, error } = await client.from("circles").select("*").in("id", circleIds);
  if (error) throw new Error(`Failed to list shareable circles: ${error.message}`);
  return (data as CircleRow[]).map(toCircle);
}

/** Pending invitations addressed to the current user's own email, across
 * every circle — for the "you've been invited" list on /circles. Filters
 * by email explicitly rather than relying on RLS alone: the table's
 * select policies are additive, so a manager of some other circle would
 * otherwise also see invitations *they sent*, not just ones addressed to
 * them. */
export async function listMyPendingInvitations(
  client: SupabaseClient,
  userEmail: string,
): Promise<CircleInvitation[]> {
  const { data, error } = await client
    .from("circle_invitations")
    .select("*")
    .eq("status", "pending")
    .ilike("invited_email", userEmail)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to list invitations: ${error.message}`);
  return (data as CircleInvitationRow[]).map(toCircleInvitation);
}
