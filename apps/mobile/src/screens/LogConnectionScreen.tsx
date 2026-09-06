import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { InteractionType } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { BackButton, Chip, SectionLabel } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { logInteraction } from "../data/interactions";
import { spacing, color } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const KINDS: { value: InteractionType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "visit", label: "Visit" },
  { value: "message", label: "Message" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

export function LogConnectionScreen({ route, navigation }: RootStackScreenProps<"LogConnection">) {
  const { personId } = route.params;
  const { user } = useAuth();
  const [kind, setKind] = useState<InteractionType>("call");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await logInteraction(user.id, personId, {
        type: kind,
        occurredAt: new Date().toISOString(),
        summary,
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't log this connection.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton label="Close" />
      <Text variant="screenTitle" style={styles.title}>
        Log a connection
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Noyala never guesses that you spoke. It knows only what you tell it.
      </Text>

      <SectionLabel>How</SectionLabel>
      <View style={styles.chipRow}>
        {KINDS.map((k) => (
          <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
        ))}
      </View>

      <Field label="What happened (optional)" value={summary} onChangeText={setSummary} multiline numberOfLines={3} style={styles.textarea} />

      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? "Logging…" : "Log it"} onPress={onSave} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.md },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: spacing.lg },
  textarea: { minHeight: 80, textAlignVertical: "top" },
  error: { color: color.red, marginBottom: spacing.sm },
});
