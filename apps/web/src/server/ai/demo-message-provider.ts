import "server-only";
import { createDeterministicDemoGenerator, type AIMessageProvider } from "@noyala/domain";

/** Thin re-export so callers only ever import from apps/web/src/server/ai. */
export function createDemoMessageProvider(): AIMessageProvider {
  return createDeterministicDemoGenerator();
}
