"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getEmailProvider } from "@/server/notifications/email-provider";
import { reportError } from "@/server/observability/error-monitoring";

const contactSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  message: z
    .string()
    .trim()
    .min(1, "Tell us what happened first — even one line helps."),
});

export interface SendSupportMessageState {
  status: "idle" | "error" | "success";
  message?: string;
  reference?: string;
  emailShown?: string;
}

/** A short, human-readable reference the sender can quote back to us. */
function generateReference(): string {
  return `NOY-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function sendSupportMessage(
  _prevState: SendSupportMessageState,
  formData: FormData,
): Promise<SendSupportMessageState> {
  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message };
  }

  const supportInbox = process.env.SUPPORT_INBOX_EMAIL;
  if (!supportInbox) {
    reportError(new Error("SUPPORT_INBOX_EMAIL is not configured"), {
      action: "sendSupportMessage",
    });
    return {
      status: "error",
      message: "Support isn't reachable through this form right now — please try again shortly.",
    };
  }

  const reference = generateReference();

  try {
    const provider = getEmailProvider();
    const result = await provider.sendEmail({
      to: supportInbox,
      subject: `Support request ${reference}`,
      body: `From: ${parsed.data.email}\nReference: ${reference}\n\n${parsed.data.message}`,
    });

    if (!result.delivered) {
      return {
        status: "error",
        message: "That didn't send. Please try again, or email us directly.",
      };
    }

    return {
      status: "success",
      reference,
      emailShown: parsed.data.email,
    };
  } catch (error) {
    reportError(error, { action: "sendSupportMessage" });
    return {
      status: "error",
      message: "That didn't send. Please try again, or email us directly.",
    };
  }
}
