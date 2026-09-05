"use server";

import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getSupabaseServiceRoleClient } from "@/server/supabase/service-role-client";
import { reportError } from "@/server/observability/error-monitoring";

export interface DeleteAccountState {
  status: "idle" | "error";
  message?: string;
}

/**
 * Deletes the signed-in user's auth.users row via the Admin API. Every
 * other table cascades from there (people -> important_dates/memories/
 * message_drafts/message_history via people's FK; profiles/consents
 * directly reference auth.users) — see the ON DELETE CASCADE constraints
 * in supabase/migrations. Regular users can't delete their own auth.users
 * row directly, so this is the one action that needs the service-role
 * client; see docs/roadmap.md for why that isn't exercised end-to-end in
 * this environment.
 */
export async function deleteAccount(
  _prevState: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  if (formData.get("confirmation") !== "DELETE") {
    return { status: "error", message: 'Type "DELETE" (in capitals) to confirm.' };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  try {
    const serviceRole = getSupabaseServiceRoleClient();
    const { error } = await serviceRole.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    reportError(error, { action: "deleteAccount" });
    return {
      status: "error",
      message: "Couldn't delete your account right now. Please try again shortly.",
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}
