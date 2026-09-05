import type { MemoryCategory } from "./types";

/**
 * Provider-independent contract for speech-to-text, mirroring the
 * AIMessageProvider pattern in messages.ts. No speech-to-text provider
 * credential exists in this environment (the same situation Stage 3 was
 * in for AI_PROVIDER_API_KEY), so only the interface and a clearly-labelled
 * deterministic mock exist here — a real adapter (e.g. calling a hosted
 * Whisper endpoint) is a drop-in implementation of this interface later,
 * not a redesign.
 */

export interface TranscriptionRequest {
  storagePath: string;
  durationSeconds: number;
}

export interface TranscriptionSuccess {
  success: true;
  transcript: string;
  provider: string;
}

export interface TranscriptionFailure {
  success: false;
  provider: string;
  reason: "timeout" | "provider_error" | "unsupported_format";
  message: string;
}

export type TranscriptionOutcome = TranscriptionSuccess | TranscriptionFailure;

export interface TranscriptionProvider {
  transcribe(request: TranscriptionRequest): Promise<TranscriptionOutcome>;
}

/**
 * Master Build Prompt §8's "clearly labelled deterministic demo generator"
 * requirement applies equally here: the transcript text itself says it's a
 * demo (provider: "demo") rather than silently returning plausible-looking
 * fake speech, which could be mistaken for a real transcription.
 */
export function createDeterministicTranscriptionProvider(): TranscriptionProvider {
  return {
    async transcribe(request) {
      return {
        success: true,
        provider: "demo",
        transcript:
          `[Demo transcript — no speech-to-text provider is configured. ` +
          `This ${request.durationSeconds}s recording was not actually transcribed.]`,
      };
    },
  };
}

export interface ExtractedFactCandidate {
  content: string;
  category: MemoryCategory;
}

/**
 * Splits a transcript into candidate facts, one per sentence. A real
 * extraction step (an LLM identifying which sentences are actually
 * memorable facts, and categorizing them) is a natural later upgrade to
 * this function's body — its callers and the extracted_memory_candidates
 * schema don't need to change for that, since every candidate already
 * requires human review before becoming a memory regardless of how it was
 * proposed (Master Build Prompt §7/§13 exit gate).
 */
export function extractFactCandidates(
  transcript: string,
  maxCandidates = 5,
): ExtractedFactCandidate[] {
  return transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, maxCandidates)
    .map((content) => ({ content, category: "general" as MemoryCategory }));
}

/**
 * Offline voice-capture queue: record now, upload/transcribe once
 * connectivity allows. Pure state machine, reusable by any client
 * (mobile's real use case, or a web client later) without depending on a
 * particular storage or network layer.
 */
export type OfflineCaptureStatus = "queued" | "uploading" | "uploaded" | "failed";

export interface OfflineCaptureItem {
  localId: string;
  localFileUri: string;
  durationSeconds: number;
  personId: string | null;
  status: OfflineCaptureStatus;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
}

export function enqueueOfflineCapture(input: {
  localId: string;
  localFileUri: string;
  durationSeconds: number;
  personId: string | null;
  now: Date;
}): OfflineCaptureItem {
  return {
    localId: input.localId,
    localFileUri: input.localFileUri,
    durationSeconds: input.durationSeconds,
    personId: input.personId,
    status: "queued",
    attemptCount: 0,
    lastError: null,
    createdAt: input.now.toISOString(),
  };
}

/**
 * The oldest queued item, or null if nothing is queued or something is
 * already uploading — safe conflict handling means never starting a
 * second concurrent upload rather than racing two attempts for the same
 * queue.
 */
export function nextOfflineCaptureToUpload(
  items: readonly OfflineCaptureItem[],
): OfflineCaptureItem | null {
  if (items.some((i) => i.status === "uploading")) return null;
  const queued = items
    .filter((i) => i.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return queued[0] ?? null;
}

export function markOfflineCaptureUploading(item: OfflineCaptureItem): OfflineCaptureItem {
  return { ...item, status: "uploading", attemptCount: item.attemptCount + 1 };
}

export function markOfflineCaptureUploaded(item: OfflineCaptureItem): OfflineCaptureItem {
  return { ...item, status: "uploaded", lastError: null };
}

/** Retries up to maxAttempts (back to "queued"), then gives up ("failed") —
 * mirrors the outbox's attempt-count/dead-letter shape in outbox.ts. */
export function markOfflineCaptureFailed(
  item: OfflineCaptureItem,
  error: string,
  maxAttempts = 3,
): OfflineCaptureItem {
  const status = item.attemptCount >= maxAttempts ? "failed" : "queued";
  return { ...item, status, lastError: error };
}
