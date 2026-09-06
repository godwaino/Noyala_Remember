import { NextResponse } from "next/server";
import { authenticateMobileRequest } from "@/server/supabase/bearer-client";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { reportError } from "@/server/observability/error-monitoring";

/**
 * Mobile equivalent of apps/web/src/server/account/actions.ts's
 * deleteAccount — regular users can't delete their own auth.users row
 * directly, so this needs the service-role client the same way the web
 * server action does. The confirmation step (typing DELETE / an in-app
 * dialog) happens client-side before this is ever called; this endpoint
 * itself just needs a valid session for the account being deleted.
 * Immediate and permanent — there is no 30-day grace period in this
 * schema (see apps/mobile/src/data/profile.ts's deleteAccount comment).
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
