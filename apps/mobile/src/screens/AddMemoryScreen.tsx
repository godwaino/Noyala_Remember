import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { MemorySensitivity } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { BackButton, SectionLabel } from "../components/primitives";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { createMemory } from "../data/memories";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const CHOICES: { value: MemorySensitivity; label: string; sub: string }[] = [
  { value: "standard", label: "Ordinary", sub: "Can inform a drafted message when you select it." },
  { value: "sensitive", label: "Private", sub: "Never used in a draft or shown to a circle, unless you choose to include it just once." },
];

export function AddMemoryScreen({ route, navigation }: RootStackScreenProps<"AddMemory">) {
  const { personId } = route.params;
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [sensitivity, setSensitivity] = useState<MemorySensitivity>("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    if (!user || !content.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createMemory(user.id, personId, { content: content.trim(), category: "general", sensitivity });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this memory.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton label="Close" />
      <Text variant="screenTitle" style={styles.title}>
        Add a memory
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        One fact per note reads best later.
      </Text>

      <Field
        label="Memory"
        hideLabel
        value={content}
        onChangeText={setContent}
        placeholder="Training for the Accra half-marathon in November"
        multiline
        numberOfLines={4}
        serif
        style={styles.textarea}
      />

      <SectionLabel>How private is it</SectionLabel>
      <View style={styles.section}>
        {CHOICES.map((c) => (
          <Card key={c.value} onPress={() => setSensitivity(c.value)} style={[styles.choice, sensitivity === c.value && styles.choiceActive]}>
            <Text variant="label" style={styles.choiceLabel}>
              {c.label}
            </Text>
            <Text variant="meta">{c.sub}</Text>
          </Card>
        ))}
      </View>

      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? "Saving…" : "Save the memory"} onPress={onSave} disabled={busy || !content.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.md },
  textarea: { minHeight: 110, textAlignVertical: "top" },
  section: { marginBottom: spacing.lg },
  choice: { marginBottom: spacing.sm },
  choiceActive: { borderColor: color.clay },
  choiceLabel: { marginBottom: 5 },
  error: { color: color.red, marginBottom: spacing.sm },
});
