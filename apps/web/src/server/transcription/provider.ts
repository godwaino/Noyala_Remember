import "server-only";
import { createDeterministicTranscriptionProvider, type TranscriptionProvider } from "@noyala/domain";

/**
 * Mirrors apps/web/src/server/ai/message-provider.ts's provider-selection
 * pattern. No real speech-to-text credential exists in this environment
 * (docs/roadmap.md's Stage 7 note — same gap Stage 3 had for
 * AI_PROVIDER_API_KEY before a key existed), so this always returns the
 * clearly-labelled deterministic demo provider today. A real adapter
 * (checking a `TRANSCRIPTION_PROVIDER_API_KEY`, say) is a drop-in
 * implementation of @noyala/domain's TranscriptionProvider interface later,
 * not a redesign of this call site.
 */
export function getTranscriptionProvider(): TranscriptionProvider {
  return createDeterministicTranscriptionProvider();
}
