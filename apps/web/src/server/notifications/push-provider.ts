import "server-only";
import type { WebPushProvider } from "@noyala/domain";
import { createConsolePushProvider } from "./console-push-provider";
import { createWebPushProvider } from "./web-push-provider";

export function getPushProvider(): WebPushProvider {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    return createWebPushProvider(publicKey, privateKey, subject);
  }

  return createConsolePushProvider();
}
