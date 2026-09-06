import * as FileSystem from "expo-file-system";
import { decode as decodeBase64 } from "base64-arraybuffer";
import { voiceCaptureInputSchema, extractFactCandidates, type VoiceCaptureInput } from "@noyala/domain";
import type { ExtractedMemoryCandidate, MemoryCategory, VoiceCapture } from "@noyala/domain";
import { supabase, callMobileApi } from "./client";
import {
  toExtractedMemoryCandidate,
  toVoiceCapture,
  type ExtractedMemoryCandidateRow,
  type VoiceCaptureRow,
} from "./mappers";

/** Uploads the local recording to the private `voice-captures` bucket
 * under this user's own folder (see the storage RLS policies in
 * supabase/migrations/20260906000200_voice_captures_storage_bucket.sql),
 * then inserts the voice_captures row pointing at it. */
export async function uploadVoiceCapture(
  userId: string,
  localFileUri: string,
  input: Omit<VoiceCaptureInput, "storagePath">,
): Promise<VoiceCapture> {
  const extension = localFileUri.split(".").pop()?.toLowerCase() || "m4a";
  const storagePath = `${userId}/${Date.now()}.${extension}`;

  const base64 = await FileSystem.readAsStringAsync(localFileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const { error: uploadError } = await supabase.storage
    .from("voice-captures")
    .upload(storagePath, decodeBase64(base64), {
      contentType: extension === "m4a" ? "audio/m4a" : "audio/mpeg",
    });
  if (uploadError) throw new Error(`Failed to upload recording: ${uploadError.message}`);

  const parsed = voiceCaptureInputSchema.parse({ ...input, storagePath });
  const { data, error } = await supabase
    .from("voice_captures")
    .insert({
      user_id: userId,
      person_id: parsed.personId ?? null,
      storage_path: parsed.storagePath,
      duration_seconds: parsed.durationSeconds,
      transcription_status: "pending",
    })
    .select("*")
    .single();
  if (error) throw new Error(`Failed to save recording: ${error.message}`);
  return toVoiceCapture(data as VoiceCaptureRow);
}

export interface TranscribeResult {
  voiceCapture: VoiceCapture;
  candidates: ExtractedMemoryCandidate[];
}

/** Transcription needs a server-side provider adapter (none configured in
 * this environment — falls back to the labelled demo transcript, same
 * pattern as message generation), so this goes through apps/web's
 * bearer-token route rather than running client-side. See
 * apps/web/src/app/api/mobile/voice-captures/[id]/transcribe. */
export async function transcribeVoiceCapture(voiceCaptureId: string): Promise<TranscribeResult> {
  return callMobileApi<TranscribeResult>(`/api/mobile/voice-captures/${voiceCaptureId}/transcribe`);
}

/** Client-side fallback so the review screen has something to show even
 * if the API call above can't reach apps/web in this environment —
 * exactly the same deterministic, clearly-labelled splitter
 * @noyala/domain already ships, just called locally. Never used to claim
 * a real transcription happened; `provider` stays "demo" either way. */
export function localFactCandidates(transcript: string): { content: string; category: MemoryCategory }[] {
  return extractFactCandidates(transcript);
}

export async function listCandidatesForCapture(voiceCaptureId: string): Promise<ExtractedMemoryCandidate[]> {
  const { data, error } = await supabase
    .from("extracted_memory_candidates")
    .select("*")
    .eq("voice_capture_id", voiceCaptureId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to list candidates: ${error.message}`);
  return (data as ExtractedMemoryCandidateRow[]).map(toExtractedMemoryCandidate);
}

/** Accepting is a separate insert into `memories`, never an automatic
 * conversion — Master Build Prompt §7/§13's review gate. */
export async function acceptCandidate(
  userId: string,
  candidate: ExtractedMemoryCandidate,
  personId: string,
): Promise<void> {
  const { data: memory, error: memoryError } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      person_id: personId,
      content: candidate.proposedContent,
      category: candidate.proposedCategory,
      sensitivity: "standard",
      source: "manual",
    })
    .select("id")
    .single();
  if (memoryError) throw new Error(`Failed to save memory: ${memoryError.message}`);

  const { error } = await supabase
    .from("extracted_memory_candidates")
    .update({ status: "accepted", resulting_memory_id: memory.id, reviewed_at: new Date().toISOString() })
    .eq("id", candidate.id);
  if (error) throw new Error(`Failed to update candidate: ${error.message}`);
}

export async function rejectCandidate(candidateId: string): Promise<void> {
  const { error } = await supabase
    .from("extracted_memory_candidates")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", candidateId);
  if (error) throw new Error(`Failed to update candidate: ${error.message}`);
}

/** Deletes just the audio, independently of the transcript or any
 * already-accepted memories — see docs/decisions/0012. */
export async function deleteVoiceCaptureAudio(capture: VoiceCapture): Promise<void> {
  if (capture.storagePath) {
    const { error: storageError } = await supabase.storage
      .from("voice-captures")
      .remove([capture.storagePath]);
    if (storageError) throw new Error(`Failed to delete recording: ${storageError.message}`);
  }
  const { error } = await supabase
    .from("voice_captures")
    .update({ storage_path: null, audio_deleted_at: new Date().toISOString() })
    .eq("id", capture.id);
  if (error) throw new Error(`Failed to update recording: ${error.message}`);
}
