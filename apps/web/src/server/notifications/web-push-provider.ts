import "server-only";
import webpush from "web-push";
import type { SendResult, SendWebPushInput, WebPushProvider } from "@noyala/domain";
import { logger } from "@/server/logger";

/**
 * Real VAPID-signed web push via the `web-push` package. Unlike email,
 * this needs no third-party account — VAPID keys are self-generated
 * key-pair crypto, and the browser's push service (FCM, Mozilla autopush,
 * etc.) is reached transparently through the subscription endpoint. See
 * docs/integrations.md for verification status.
 */
export function createWebPushProvider(
  vapidPublicKey: string,
  vapidPrivateKey: string,
  vapidSubject: string,
): WebPushProvider {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  return {
    async sendPush(input: SendWebPushInput): Promise<SendResult> {
      const payload = JSON.stringify({
        title: input.title,
        body: input.body,
        url: input.url,
      });

      try {
        await webpush.sendNotification(input.subscription, payload);
        return { delivered: true, provider: "web-push" };
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode: number }).statusCode
            : undefined;
        // 404/410 mean the subscription is gone (user revoked permission,
        // uninstalled, or the browser expired it) — the caller should
        // delete it rather than retry.
        const permanentFailure = statusCode === 404 || statusCode === 410;
        logger.error("Web push send failed", { statusCode });
        return { delivered: false, provider: "web-push", permanentFailure };
      }
    },
  };
}
