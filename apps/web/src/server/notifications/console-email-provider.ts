import "server-only";
import type { EmailProvider, SendEmailInput, SendResult } from "@noyala/domain";
import { logger } from "@/server/logger";

/**
 * Dev/no-key fallback. Never disguised as a real send — the log line and
 * `provider: "console"` make it unambiguous, per the Master Build Prompt's
 * "do not disguise demo text as live output" principle (§8, applied here
 * to email rather than AI generation).
 */
export function createConsoleEmailProvider(): EmailProvider {
  return {
    async sendEmail(input: SendEmailInput): Promise<SendResult> {
      logger.info("Email provider not configured — logging instead of sending", {
        to: input.to,
        subject: input.subject,
      });
      return { delivered: true, provider: "console" };
    },
  };
}
