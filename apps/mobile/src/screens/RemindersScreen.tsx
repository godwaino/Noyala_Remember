import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import type { ReminderChannel } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { BackButton, Chip, SectionLabel } from "../components/primitives";
import { SwitchRow } from "../components/Switch";
import { LoadingState } from "../components/Skeleton";
import { useProfile } from "../lib/profile";
import { updateNotificationPreferences } from "../data/profile";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const OFFSETS = [14, 7, 1, 0];

export function RemindersScreen({}: RootStackScreenProps<"Reminders">) {
  const { profile, refresh } = useProfile();
  const [saving, setSaving] = useState(false);

  if (!profile) return <LoadingState label="Loading reminders…" />;

  async function setChannel(channel: ReminderChannel) {
    if (!profile) return;
    setSaving(true);
    await updateNotificationPreferences(channel, profile.defaultReminderOffsets);
    await refresh();
    setSaving(false);
  }

  async function toggleOffset(value: number) {
    if (!profile) return;
    const next = profile.defaultReminderOffsets.includes(value)
      ? profile.defaultReminderOffsets.filter((v) => v !== value)
      : [...profile.defaultReminderOffsets, value];
    if (next.length === 0) return;
    setSaving(true);
    await updateNotificationPreferences(profile.preferredReminderChannel, next);
    await refresh();
    setSaving(false);
  }

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Reminders
      </Text>

      <View style={styles.section}>
        <SwitchRow
          label="Push notifications"
          sub="One notification listing what's coming — never a nudge to open the app."
          value={profile.preferredReminderChannel === "push"}
          onValueChange={(v) => setChannel(v ? "push" : "email")}
          last
        />
      </View>

      <SectionLabel>How far ahead</SectionLabel>
      <View style={styles.chipRow}>
        {OFFSETS.map((o) => (
          <Chip
            key={o}
            label={o === 0 ? "On the day" : `${o} days before`}
            active={profile.defaultReminderOffsets.includes(o)}
            onPress={() => toggleOffset(o)}
          />
        ))}
      </View>
      {saving ? (
        <Text variant="meta" style={styles.saving}>
          Saving…
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  saving: { marginTop: spacing.md },
});
