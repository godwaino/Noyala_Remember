"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export interface RequestLoginCodeState {
  status: "idle" | "success" | "error";
  message?: string;
  email?: string;
}

/**
 * Sends a one-time code, not a clickable link — see
 * docs/decisions/0009-otp-code-sign-in.md. The Supabase call is the same
 * `signInWithOtp` used for magic links; whether the email contains a link
 * or a code is controlled entirely by the "Magic Link" template configured
 * in the Supabase dashboard, not by this call.
 */
export async function requestLoginCode(
  _prevState: RequestLoginCodeState,
  formData: FormData,
): Promise<RequestLoginCodeState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message: "Check your email for a 6-digit code.",
      email: parsed.data.email,
    };
  } catch (error) {
    reportError(error, { action: "requestLoginCode" });
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Sign-in isn't available right now.",
    };
  }
}

const verifySchema = z.object({
  email: z.string().trim().email(),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export interface VerifyLoginCodeState {
  status: "idle" | "error";
  message?: string;
}

export async function verifyLoginCode(
  _prevState: VerifyLoginCodeState,
  formData: FormData,
): Promise<VerifyLoginCodeState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  redirect("/onboarding");
}
