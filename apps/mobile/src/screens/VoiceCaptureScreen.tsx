import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets } from "expo-audio";
import type { ExtractedMemoryCandidate, Person } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Chip, BackButton } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { listPeople, displayName } from "../data/people";
import {
  uploadVoiceCapture,
  transcribeVoiceCapture,
  acceptCandidate,
  rejectCandidate,
  deleteVoiceCaptureAudio,
} from "../data/voice";
import type { VoiceCapture } from "@noyala/domain";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

type Step = "ask" | "denied" | "recording" | "processing" | "review";

/**
 * Recording uses expo-audio's `useAudioRecorder`/`useAudioRecorderState`
 * hooks (the SDK 52+ replacement for expo-av's Audio.Recording). Not
 * verified against a real device or simulator in this environment — see
 * docs/roadmap.md's existing device-verification gaps; this is built
 * against the documented contract the same way that file already handles
 * a provider it can't fully exercise here.
 */
export function VoiceCaptureScreen({ route, navigation }: RootStackScreenProps<"VoiceCapture">) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("ask");
  const [deniedReason, setDeniedReason] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [capture, setCapture] = useState<VoiceCapture | null>(null);
  const [candidates, setCandidates] = useState<ExtractedMemoryCandidate[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [personId, setPersonId] = useState<string | null>(route.params.personId ?? null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  useEffect(() => {
    if (user) listPeople(user.id).then(setPeople);
  }, [user]);

  useEffect(() => {
    if (recorderState.isRecording) setElapsed(Math.round(recorderState.durationMillis / 1000));
  }, [recorderState.durationMillis, recorderState.isRecording]);

  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setDeniedReason("Noyala needs microphone access to record a voice note.");
      setStep("denied");
      return;
    }
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStep("recording");
  }

  async function stopRecording() {
    await recorder.stop();
    setStep("processing");
    const uri = recorder.uri;
    if (!user || !uri) {
      setStep("ask");
      return;
    }
    try {
      const uploaded = await uploadVoiceCapture(user.id, uri, {
        durationSeconds: Math.max(1, elapsed),
        personId,
      });
      setCapture(uploaded);
      const result = await transcribeVoiceCapture(uploaded.id);
      setCandidates(result.candidates);
      setStep("review");
    } catch {
      setStep("ask");
    }
  }

  async function onAccept(candidate: ExtractedMemoryCandidate) {
    const targetPersonId = candidate.personId ?? personId;
    if (!user || !targetPersonId) return;
    await acceptCandidate(user.id, candidate, targetPersonId);
    setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, status: "accepted" } : c)));
  }

  async function onReject(candidate: ExtractedMemoryCandidate) {
    await rejectCandidate(candidate.id);
    setCandidates((prev) => prev.map((c) => (c.id === candidate.id ? { ...c, status: "rejected" } : c)));
  }

  async function onDeleteAudio() {
    if (capture) await deleteVoiceCaptureAudio(capture);
    navigation.goBack();
  }

  return (
    <Screen>
      <BackButton label="Close" />

      {step === "ask" ? (
        <View>
          <Text variant="screenTitle" style={styles.title}>
            Say what you remember
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Speak freely. Noyala pulls out the facts and shows them to you one by one — nothing is saved
            until you accept it.
          </Text>
          {!personId && people.length > 0 ? (
            <View style={styles.section}>
              <Text variant="meta" style={styles.aboutLabel}>
                About (optional)
              </Text>
              <View style={styles.chipRow}>
                {people.slice(0, 8).map((p) => (
                  <Chip key={p.id} label={displayName(p)} active={personId === p.id} onPress={() => setPersonId(p.id)} />
                ))}
              </View>
            </View>
          ) : null}
          <Button label="Start recording" onPress={startRecording} />
        </View>
      ) : null}

      {step === "denied" ? (
        <View>
          <Text variant="sectionTitle" style={styles.title}>
            The microphone is blocked
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            {deniedReason} You can type the memory instead — nothing is lost either way.
          </Text>
          <Button
            label="Type it instead"
            onPress={() => (personId ? navigation.replace("AddMemory", { personId }) : navigation.goBack())}
          />
        </View>
      ) : null}

      {step === "recording" ? (
        <View>
          <Text variant="eyebrowClay" style={styles.recordingLabel}>
            Recording · {formatTime(elapsed)}
          </Text>
          <View style={styles.bars}>
            {Array.from({ length: 14 }).map((_, i) => (
              <View key={i} style={[styles.bar, { height: 14 + ((i * 7) % 60) }]} />
            ))}
          </View>
          <Text variant="bodyMuted" style={styles.sub}>
            Audio stays on this phone until you accept a fact from it, and deletes itself after thirty
            days.
          </Text>
          <Button label="Stop" onPress={stopRecording} />
        </View>
      ) : null}

      {step === "processing" ? (
        <View style={styles.section}>
          <Text variant="bodyMuted">Transcribing and pulling out the facts.</Text>
        </View>
      ) : null}

      {step === "review" ? (
        <View>
          <Text variant="sectionTitle" style={styles.title}>
            {candidates.length} {candidates.length === 1 ? "fact" : "facts"} heard
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Accept the ones that are right. Reject anything Noyala misheard.
          </Text>
          {!personId ? (
            <View style={styles.section}>
              <Text variant="meta" style={styles.aboutLabel}>
                Who is this about?
              </Text>
              <View style={styles.chipRow}>
                {people.slice(0, 8).map((p) => (
                  <Chip key={p.id} label={displayName(p)} active={personId === p.id} onPress={() => setPersonId(p.id)} />
                ))}
              </View>
            </View>
          ) : null}
          {candidates.map((c) => (
            <Card key={c.id} style={styles.candidateCard}>
              <Text variant="memoryBody" style={styles.candidateText}>
                {c.proposedContent}
              </Text>
              {c.status === "pending" ? (
                <View style={styles.candidateActions}>
                  <Button label="Accept" variant="secondary" fullWidth={false} disabled={!personId} onPress={() => onAccept(c)} />
                  <Button label="Reject" variant="text" fullWidth={false} onPress={() => onReject(c)} />
                </View>
              ) : (
                <Text variant="meta" style={{ color: c.status === "accepted" ? color.sage : color.inkMuted }}>
                  {c.status === "accepted" ? "Saved as a memory" : "Rejected"}
                </Text>
              )}
            </Card>
          ))}
          <Button label="Delete the recording" variant="secondary" onPress={onDeleteAudio} />
        </View>
      ) : null}
    </Screen>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  aboutLabel: { marginBottom: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  recordingLabel: { marginBottom: spacing.md },
  bars: { flexDirection: "row", gap: 5, alignItems: "flex-end", height: 80, marginBottom: spacing.lg },
  bar: { flex: 1, backgroundColor: color.peach, borderRadius: 2 },
  candidateCard: { marginBottom: spacing.smd },
  candidateText: { marginBottom: 10 },
  candidateActions: { flexDirection: "row", gap: 6 },
});
