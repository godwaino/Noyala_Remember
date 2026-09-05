import "server-only";
import type { EmailProvider } from "@noyala/domain";
import { createConsoleEmailProvider } from "./console-email-provider";
import { createResendEmailProvider } from "./resend-email-provider";

export function getEmailProvider(): EmailProvider {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  if (apiKey && fromAddress) {
    return createResendEmailProvider(apiKey, fromAddress);
  }

  return createConsoleEmailProvider();
}
