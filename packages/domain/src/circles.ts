import type { CircleRole } from "./types";

/**
 * Pure role-permission checks for Stage 6 circles. These mirror — but do
 * not replace — the server-enforced RLS policies in
 * supabase/migrations/20260905000500_circles.sql onward (Master Build
 * Prompt §11: "Access must be server-enforced, not merely hidden in the
 * interface"). Used only to decide what the UI offers; the database is the
 * real authority.
 */

/** Only the owner may rename/delete the circle. */
export function canManageCircle(role: CircleRole): boolean {
  return role === "owner";
}

/** Only the owner or an organiser may send/revoke invitations. */
export function canManageInvitations(role: CircleRole): boolean {
  return role === "owner" || role === "organiser";
}

/** Only the owner or an organiser may share one of their own people into
 * the circle — a viewer can see and plan gifts but not decide what gets
 * shared. */
export function canShareOwnPerson(role: CircleRole): boolean {
  return role === "owner" || role === "organiser";
}

/**
 * Gift planning is deliberately open to every role — Master Build Prompt
 * §11 calls it "collaborative", unlike circle/sharing management, which
 * stays owner/organiser-only.
 */
export function canPlanGifts(_role: CircleRole): boolean {
  return true;
}

/** A member can always remove themselves (leave); only the owner can
 * remove someone else. */
export function canRemoveMember(actingRole: CircleRole, isRemovingSelf: boolean): boolean {
  return isRemovingSelf || actingRole === "owner";
}
