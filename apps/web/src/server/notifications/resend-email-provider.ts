import "server-only";
import type { EmailProvider, SendEmailInput, SendResult } from "@noyala/domain";
import { logger } from "@/server/logger";

/**
 * Minimal Resend (https://resend.com) HTTP integration — a single fetch
 * call, no SDK dependency for something this small. Implemented, not yet
 * verified against the provider (no API key in this environment) — see
 * docs/integrations.md.
 */
export function createResendEmailProvider(apiKey: string, fromAddress: string): EmailProvider {
  return {
    async sendEmail(input: SendEmailInput): Promise<SendResult> {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: input.to,
          subject: input.subject,
          text: input.body,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error("Resend email send failed", { status: response.status, errorBody });
        // 4xx other than rate-limiting means the request itself is invalid
        // (bad address, unverified domain) — retrying won't help.
        const permanentFailure = response.status >= 400 && response.status < 500 && response.status !== 429;
        return { delivered: false, provider: "resend", permanentFailure };
      }

      return { delivered: true, provider: "resend" };
    },
  };
}
