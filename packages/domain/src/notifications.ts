/**
 * Provider-independent contracts for reminder delivery. Concrete
 * implementations live in apps/web/src/server/notifications — this file
 * only defines the shape, per docs/architecture.md's provider-adapter
 * pattern, so a provider swap never touches calling code.
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendResult {
  delivered: boolean;
  /** Which concrete provider handled this — e.g. "console" or "resend". */
  provider: string;
  /** Present when a subscription/address is permanently invalid and the
   * caller should stop retrying (e.g. delete the push subscription). */
  permanentFailure?: boolean;
}

export interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendResult>;
}

export interface WebPushKeys {
  p256dh: string;
  auth: string;
}

export interface WebPushSubscription {
  endpoint: string;
  keys: WebPushKeys;
}

export interface SendWebPushInput {
  subscription: WebPushSubscription;
  title: string;
  body: string;
  /** Deep link opened when the notification is clicked. */
  url?: string;
}

export interface WebPushProvider {
  sendPush(input: SendWebPushInput): Promise<SendResult>;
}
