import "server-only";
import type { SendResult, SendWebPushInput, WebPushProvider } from "@noyala/domain";
import { logger } from "@/server/logger";

/** Dev/no-VAPID-key fallback — see console-email-provider.ts for the rationale. */
export function createConsolePushProvider(): WebPushProvider {
  return {
    async sendPush(input: SendWebPushInput): Promise<SendResult> {
      logger.info("Push provider not configured — logging instead of sending", {
        endpoint: input.subscription.endpoint,
        title: input.title,
      });
      return { delivered: true, provider: "console" };
    },
  };
}
