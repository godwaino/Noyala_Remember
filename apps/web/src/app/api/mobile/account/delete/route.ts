import { NextResponse } from "next/server";
import { authenticateMobileRequest } from "@/server/supabase/bearer-client";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { reportError } from "@/server/observability/error-monitoring";

/**
 * Regular users can't delete their own auth.users row directly, so this
 * needs the service-role client — same as the erasure half of the web
 * flow (src/server/outbox/process-account-deletions.ts). The confirmation
 * step (typing DELETE / an in-app dialog) happens client-side before this
 * is ever called; this endpoint itself just needs a valid session for the
 * account being deleted.
 *
 * Immediate and permanent, unlike the web flow: the schema does have a
 * 30-day recoverable-deletion table now (account_deletion_requests, see
 * supabase/migrations/20260907000100_account_deletion_requests.sql), but
 * this endpoint predates it and hasn't been moved onto it — see
 * apps/mobile/src/data/profile.ts's deleteAccount comment. Left as-is:
 * changing the mobile app's delete flow wasn't in scope for that work.
 */
export async function POST(request: Request) {
  const auth = await authenticateMobileRequest(request);
  if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const serviceRole = getSupabaseServiceRoleClient();
    const { error } = await serviceRole.auth.admin.deleteUser(auth.user.id);
    if (error) throw error;
  } catch (error) {
    reportError(error, { action: "mobile.deleteAccount" });
    return NextResponse.json(
      { error: "Couldn't delete your account right now. Please try again shortly." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
