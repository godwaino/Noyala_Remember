import type { ExtractedMemoryCandidate, VoiceCapture } from "@noyala/domain";

export interface VoiceCaptureRow {
  id: string;
  user_id: string;
  person_id: string | null;
  storage_path: string | null;
  duration_seconds: number;
  transcription_status: VoiceCapture["transcriptionStatus"];
  transcript: string | null;
  audio_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function toVoiceCapture(row: VoiceCaptureRow): VoiceCapture {
  return {
    id: row.id,
    userId: row.user_id,
    personId: row.person_id,
    storagePath: row.storage_path ?? "",
    durationSeconds: row.duration_seconds,
    transcriptionStatus: row.transcription_status,
    transcript: row.transcript,
    audioDeletedAt: row.audio_deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ExtractedMemoryCandidateRow {
  id: string;
  user_id: string;
  voice_capture_id: string;
  person_id: string | null;
  proposed_content: string;
  proposed_category: ExtractedMemoryCandidate["proposedCategory"];
  status: ExtractedMemoryCandidate["status"];
  resulting_memory_id: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function toExtractedMemoryCandidate(row: ExtractedMemoryCandidateRow): ExtractedMemoryCandidate {
  return {
    id: row.id,
    userId: row.user_id,
    voiceCaptureId: row.voice_capture_id,
    personId: row.person_id,
    proposedContent: row.proposed_content,
    proposedCategory: row.proposed_category,
    status: row.status,
    resultingMemoryId: row.resulting_memory_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}
