import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { DuplicateMatch, PersonImportCandidate } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { BackButton } from "../components/primitives";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { pickOne } from "../lib/contacts";
import { findDuplicatesAgainstExisting, confirmImport, undoImport } from "../data/import";
import { spacing, color } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

type Step = "ask" | "preview" | "duplicates" | "done";

export function ImportContactsScreen({ navigation }: RootStackScreenProps<"ImportContacts">) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("ask");
  const [candidates, setCandidates] = useState<PersonImportCandidate[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function addOne() {
    const picked = await pickOne();
    if (picked) setCandidates((prev) => [...prev, { ...picked, sourceRowIndex: prev.length }]);
  }

  function removeCandidate(index: number) {
    setCandidates((prev) => prev.filter((_, i) => i !== index));
  }

  async function goToPreview() {
    if (!user || candidates.length === 0) return;
    const matches = await findDuplicatesAgainstExisting(user.id, candidates);
    if (matches.length > 0) {
      setDuplicates(matches);
      setStep("duplicates");
    } else {
      setStep("preview");
    }
  }

  async function doImport(finalCandidates: PersonImportCandidate[]) {
    if (!user) return;
    setBusy(true);
    try {
      const { personIds } = await confirmImport(user.id, finalCandidates);
      setImportedIds(personIds);
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton label="Close" />

      {step === "ask" ? (
        <View>
          <Text variant="screenTitle" style={styles.title}>
            Pick from contacts
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Your phone's own picker opens. It hands back only the people you tap, and Noyala shows you
            every field before saving anything.
          </Text>
          {candidates.map((c, i) => (
            <View key={i} style={styles.pickedRow}>
              <Text variant="body" style={styles.flex1}>
                {c.firstName} {c.lastName ?? ""}
              </Text>
              <Button label="Remove" variant="text" fullWidth={false} onPress={() => removeCandidate(i)} />
            </View>
          ))}
          <Button label="Open the picker" onPress={addOne} style={styles.gap} />
          {candidates.length > 0 ? (
            <Button label={`Continue with ${candidates.length}`} onPress={goToPreview} style={styles.gap} />
          ) : null}
          <Button label="Add by hand instead" variant="secondary" onPress={() => navigation.replace("AddPerson")} />
        </View>
      ) : null}

      {step === "duplicates" ? (
        <View>
          <Text variant="sectionTitle" style={styles.title}>
            Some of these look familiar
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Same name, same relationship. You decide, not Noyala.
          </Text>
          {duplicates.map((d) => (
            <Card key={d.candidateIndex} style={styles.dupCard}>
              <Text variant="label" style={styles.dupLabel}>
                {candidates[d.candidateIndex]?.firstName} looks like {d.existingPersonName}
              </Text>
              <Text variant="meta">Matched on {d.reason}</Text>
            </Card>
          ))}
          <Button label="Add anyway" onPress={() => setStep("preview")} style={styles.gap} />
          <Button
            label="Skip the matches"
            variant="secondary"
            onPress={() => {
              const skip = new Set(duplicates.map((d) => d.candidateIndex));
              setCandidates((prev) => prev.filter((_, i) => !skip.has(i)));
              setStep("preview");
            }}
          />
        </View>
      ) : null}

      {step === "preview" ? (
        <View>
          <Text variant="sectionTitle" style={styles.title}>
            What Noyala found
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            Nothing is written until you confirm.
          </Text>
          {candidates.map((c, i) => (
            <Card key={i} style={styles.previewCard}>
              <Text variant="label">
                {c.firstName} {c.lastName ?? ""}
              </Text>
              <Text variant="meta">
                {[c.phone, c.email].filter(Boolean).join(" · ") || "No phone or email"}
              </Text>
            </Card>
          ))}
          <Button label={busy ? "Saving…" : `Continue with ${candidates.length}`} onPress={() => doImport(candidates)} disabled={busy} />
        </View>
      ) : null}

      {step === "done" ? (
        <View>
          <Text variant="sectionTitle" style={styles.title}>
            {importedIds.length} {importedIds.length === 1 ? "person" : "people"} added
          </Text>
          <Text variant="bodyMuted" style={styles.sub}>
            You can undo this import for a little while if something looks wrong.
          </Text>
          <Button label="See everyone" onPress={() => navigation.navigate("Tabs")} style={styles.gap} />
          <Button
            label="Undo this import"
            variant="text"
            onPress={async () => {
              if (user) await undoImport(user.id, importedIds);
              navigation.navigate("Tabs");
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  pickedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.hairline },
  flex1: { flex: 1 },
  gap: { marginBottom: spacing.sm },
  dupCard: { marginBottom: spacing.sm },
  dupLabel: { marginBottom: 4 },
  previewCard: { marginBottom: spacing.sm },
});
