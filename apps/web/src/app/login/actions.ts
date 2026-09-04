"use server";

import { z } from "zod";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";

const requestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export interface RequestMagicLinkState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function requestMagicLink(
  _prevState: RequestMagicLinkState,
  formData: FormData,
): Promise<RequestMagicLinkState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${appUrl}/auth/callback` },
    });

    if (error) {
      return { status: "error", message: error.message };
    }

    return {
      status: "success",
      message: "Check your email for a sign-in link.",
    };
  } catch (error) {
    reportError(error, { action: "requestMagicLink" });
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Sign-in isn't available right now.",
    };
  }
}
