import React, { useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import type { MessageTone, ReminderChannel } from "@noyala/domain";
import { Screen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Field } from "../../components/Field";
import { Chip, SectionLabel } from "../../components/primitives";
import { color, spacing } from "../../theme";
import type { AuthStackScreenProps } from "../../navigation/types";

const OFFSET_OPTIONS = [
  { value: 14, label: "14 days before" },
  { value: 7, label: "7 days before" },
  { value: 1, label: "1 day before" },
  { value: 0, label: "On the day" },
];

const TONE_OPTIONS: { value: MessageTone; label: string }[] = [
  { value: "short_and_warm", label: "Short and warm" },
  { value: "thoughtful", label: "Thoughtful" },
  { value: "funny", label: "Playful" },
  { value: "professional", label: "Professional" },
  { value: "faith_based", label: "Faith-based" },
];

/**
 * The design's mock collapses this into "a time of day to hear about
 * things" — but that isn't a field this schema has (see
 * onboardingInputSchema in @noyala/domain): what's actually persisted is a
 * set of days-before-occasion reminder offsets, a channel, and a default
 * message tone, plus an explicit acknowledgement of how saved personal
 * details may be used before any AI drafting happens. This screen collects
 * the real fields instead of a picker for one that doesn't exist.
 */
export function ProfileSetupScreen({ navigation }: AuthStackScreenProps<"ProfileSetup">) {
  const timezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  const [displayName, setDisplayName] = useState("");
  const [offsets, setOffsets] = useState<number[]>([14, 7, 1, 0]);
  const [channel, setChannel] = useState<ReminderChannel>("push");
  const [tone, setTone] = useState<MessageTone>("short_and_warm");
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleOffset(value: number) {
    setOffsets((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function onContinue() {
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }
    navigation.navigate("Permissions", {
      draft: {
        displayName: displayName.trim(),
        timezone,
        locale: "en",
        defaultReminderOffsets: offsets,
        preferredReminderChannel: channel,
        defaultTone: tone,
        acknowledgedMemoryUsage: true as const,
      },
    });
  }

  return (
    <Screen>
      <SectionLabel clay>Step 2 of 3</SectionLabel>
      <Text variant="screenTitle" style={styles.title}>
        A little about you
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Your timezone decides when a date turns over, so a reminder lands in your morning rather than
        someone else's.
      </Text>

      <Field label="First name" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          Timezone
        </Text>
        <View style={styles.timezoneBox}>
          <Text variant="body">{timezone}</Text>
          <Text variant="meta">Detected</Text>
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          Remind me
        </Text>
        <View style={styles.row}>
          {OFFSET_OPTIONS.map((o) => (
            <Chip key={o.value} label={o.label} active={offsets.includes(o.value)} onPress={() => toggleOffset(o.value)} />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          How
        </Text>
        <View style={styles.row}>
          <Chip label="Push notification" active={channel === "push"} onPress={() => setChannel("push")} />
          <Chip label="Email" active={channel === "email"} onPress={() => setChannel("email")} />
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          Usual tone for messages
        </Text>
        <View style={styles.row}>
          {TONE_OPTIONS.map((t) => (
            <Chip key={t.value} label={t.label} active={tone === t.value} onPress={() => setTone(t.value)} />
          ))}
        </View>
      </View>

      <Button
        label={acknowledged ? "I understand — noted" : "How saved details are used"}
        variant="secondary"
        onPress={() => setAcknowledged(true)}
        style={styles.ack}
      />
      <Text variant="meta" style={styles.ackNote}>
        A memory only informs a drafted message when you explicitly select it for that draft — Noyala
        never scans everything you've saved on its own.
      </Text>

      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button
        label="Continue"
        onPress={onContinue}
        disabled={!displayName.trim() || offsets.length === 0 || !acknowledged}
        style={styles.continueButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, fontWeight: "500" },
  timezoneBox: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  ack: { marginBottom: spacing.xs },
  ackNote: { marginBottom: spacing.lg },
  error: { color: color.red, marginBottom: spacing.sm },
  continueButton: { marginTop: spacing.sm },
});
