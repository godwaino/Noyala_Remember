import "server-only";
import type { AIMessageProvider } from "@noyala/domain";
import { createOpenAIMessageProvider } from "./openai-message-provider";
import { createDemoMessageProvider } from "./demo-message-provider";

export function getMessageProvider(): AIMessageProvider {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  if (apiKey) {
    return createOpenAIMessageProvider(apiKey);
  }
  return createDemoMessageProvider();
}
