"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

/**
 * How long a requested deletion sits recoverable before the daily cron
 * (see src/server/outbox/process-account-deletions.ts) erases it for
 * real. A technical default, not a number anyone outside engineering has
 * validated — same caveat as src/server/outbox/purge-old-records.ts's
 * retention windows.
 */
// Not exported — a "use server" file may only export async functions, and
// nothing outside this module needs the number.
const ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS = 30;

/**
 * Replaces the old immediate `auth.admin.deleteUser` call this file used
 * to make (see git history / docs/decisions if you're looking for it).
 * Deletion is now a two-step flow: re-verify you still control this
 * inbox (requestDeletionReverificationCode / verifyDeletionReverificationCode,
 * adapted from the OTP sign-in pattern in
 * (marketing)/login/actions.ts — see docs/decisions/0009-otp-code-sign-in.md),
 * then submitAccountDeletion records a *request* with a recovery window
 * rather than deleting anything itself. The service-role client and the
 * actual `auth.admin.deleteUser` call now live in
 * src/server/outbox/process-account-deletions.ts, run by the daily cron
 * once a request's erase_after has passed.
 */

export interface RequestReverificationState {
  status: "idle" | "sent" | "error";
  message?: string;
}

/**
 * Sends a fresh 6-digit code to the *signed-in user's own* email — never
 * to an address the client supplies. The whole point of this step is
 * confirming the person completing deletion still controls the account's
 * inbox, so the target address can't be something submitted in form data.
 */
export async function requestDeletionReverificationCode(
  _prevState: RequestReverificationState,
): Promise<RequestReverificationState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  try {
    const { error } = await supabase.auth.signInWithOtp({ email: user.email });
    if (error) return { status: "error", message: error.message };
    return { status: "sent", message: `We sent a 6-digit code to ${user.email}.` };
  } catch (error) {
    reportError(error, { action: "requestDeletionReverificationCode" });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Couldn't send a code right now.",
    };
  }
}

const verifySchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export interface VerifyReverificationState {
  status: "idle" | "verified" | "error";
  message?: string;
}

export async function verifyDeletionReverificationCode(
  _prevState: VerifyReverificationState,
  formData: FormData,
): Promise<VerifyReverificationState> {
  const parsed = verifySchema.safeParse({ token: formData.get("token") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { error } = await supabase.auth.verifyOtp({
    email: user.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "verified" };
}

const submitSchema = z.object({
  confirmation: z
    .string()
    .refine((value) => value === "DELETE", 'Type "DELETE" (in capitals) to confirm.'),
  reason: z.string().trim().max(2000).optional(),
});

export interface SubmitDeletionState {
  status: "idle" | "scheduled" | "error";
  message?: string;
  eraseAfter?: string;
}

/**
 * Records the deletion request. Upserts on user_id: re-requesting after a
 * cancellation resets status/requested_at/erase_after rather than
 * conflicting, per account_deletion_requests being one row per user (see
 * the migration).
 */
export async function submitAccountDeletion(
  _prevState: SubmitDeletionState,
  formData: FormData,
): Promise<SubmitDeletionState> {
  const parsed = submitSchema.safeParse({
    confirmation: formData.get("confirmation"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const eraseAfter = new Date(
    now.getTime() + ACCOUNT_DELETION_RECOVERY_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const { error } = await supabase.from("account_deletion_requests").upsert({
    user_id: user.id,
    status: "pending",
    reason: parsed.data.reason ?? null,
    requested_at: now.toISOString(),
    erase_after: eraseAfter.toISOString(),
    cancelled_at: null,
  });

  if (error) {
    reportError(error, { action: "submitAccountDeletion" });
    return {
      status: "error",
      message: "Couldn't schedule deletion right now. Please try again shortly.",
    };
  }

  return { status: "scheduled", eraseAfter: eraseAfter.toISOString() };
}

export interface CancelDeletionState {
  status: "idle" | "cancelled" | "error";
  message?: string;
}

export async function cancelAccountDeletion(
  _prevState: CancelDeletionState,
): Promise<CancelDeletionState> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("account_deletion_requests")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    reportError(error, { action: "cancelAccountDeletion" });
    return {
      status: "error",
      message: "Couldn't cancel right now. Please try again shortly.",
    };
  }

  return { status: "cancelled" };
}

export async function signOutFromAccount() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
