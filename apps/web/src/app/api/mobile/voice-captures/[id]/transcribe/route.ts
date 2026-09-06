import { NextResponse } from "next/server";
import { extractFactCandidates } from "@noyala/domain";
import { authenticateMobileRequest } from "@/server/supabase/bearer-client";
import { getTranscriptionProvider } from "@/server/transcription/provider";
import { toExtractedMemoryCandidate, toVoiceCapture, type ExtractedMemoryCandidateRow, type VoiceCaptureRow } from "@/server/voice-captures/mappers";
import { reportError } from "@/server/observability/error-monitoring";

/**
 * Transcription needs a provider adapter (server-only today — see
 * server/transcription/provider.ts) the same way message generation needs
 * the AI provider key, so this is the other operation apps/mobile can't do
 * with a direct Supabase call. On success, also runs the sentence-splitting
 * fact extractor and inserts the resulting `extracted_memory_candidates`
 * rows as `pending` — nothing becomes a real memory here; that only
 * happens when the user explicitly accepts one (see
 * apps/mobile/src/data/voice.ts's acceptCandidate).
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticateMobileRequest(request);
  if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: loadError } = await auth.client
    .from("voice_captures")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (loadError) {
    reportError(loadError, { action: "mobile.transcribe.load", voiceCaptureId: id });
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ error: "Recording not found" }, { status: 404 });

  const row = existing as VoiceCaptureRow;

  if (row.transcription_status === "succeeded" && row.transcript) {
    const { data: candidateRows, error: candidatesError } = await auth.client
      .from("extracted_memory_candidates")
      .select("*")
      .eq("voice_capture_id", id)
      .order("created_at", { ascending: true });
    if (candidatesError) {
      return NextResponse.json({ error: candidatesError.message }, { status: 500 });
    }
    return NextResponse.json({
      voiceCapture: toVoiceCapture(row),
      candidates: (candidateRows as ExtractedMemoryCandidateRow[]).map(toExtractedMemoryCandidate),
    });
  }

  await auth.client.from("voice_captures").update({ transcription_status: "processing" }).eq("id", id);

  const provider = getTranscriptionProvider();
  const outcome = await provider.transcribe({
    storagePath: row.storage_path ?? "",
    durationSeconds: row.duration_seconds,
  });

  if (!outcome.success) {
    await auth.client.from("voice_captures").update({ transcription_status: "failed" }).eq("id", id);
    reportError(new Error(outcome.message), { action: "mobile.transcribe", voiceCaptureId: id });
    return NextResponse.json({ error: outcome.message }, { status: 502 });
  }

  const { data: updated, error: updateError } = await auth.client
    .from("voice_captures")
    .update({ transcription_status: "succeeded", transcript: outcome.transcript })
    .eq("id", id)
    .select("*")
    .single();
  if (updateError || !updated) {
    reportError(updateError, { action: "mobile.transcribe.update", voiceCaptureId: id });
    return NextResponse.json({ error: updateError?.message ?? "Couldn't save the transcript." }, { status: 500 });
  }

  const facts = extractFactCandidates(outcome.transcript);
  const candidateRows =
    facts.length > 0
      ? facts.map((f) => ({
          user_id: auth.user.id,
          voice_capture_id: id,
          person_id: row.person_id,
          proposed_content: f.content,
          proposed_category: f.category,
          status: "pending" as const,
        }))
      : [];

  const { data: insertedCandidates, error: insertError } =
    candidateRows.length > 0
      ? await auth.client.from("extracted_memory_candidates").insert(candidateRows).select("*")
      : { data: [], error: null };
  if (insertError) {
    reportError(insertError, { action: "mobile.transcribe.insertCandidates", voiceCaptureId: id });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({
    voiceCapture: toVoiceCapture(updated as VoiceCaptureRow),
    candidates: ((insertedCandidates ?? []) as ExtractedMemoryCandidateRow[]).map(toExtractedMemoryCandidate),
  });
}
