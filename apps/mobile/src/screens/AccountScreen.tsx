import React from "react";
import { StyleSheet, View } from "react-native";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { BackButton } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function AccountScreen({}: RootStackScreenProps<"Account">) {
  const { user } = useAuth();
  const { profile } = useProfile();

  const rows = [
    { label: "Name", sub: profile?.displayName ?? "—" },
    { label: "Email", sub: user?.email ?? "—" },
    { label: "Timezone", sub: profile?.timezone ?? "—" },
    { label: "Default tone", sub: profile?.defaultTone.replace(/_/g, " ") ?? "—" },
    {
      label: "Member since",
      sub: profile ? new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date(profile.createdAt)) : "—",
    },
  ];

  return (
    <Screen>
      <BackButton />
      <Text variant="screenTitle" style={styles.title}>
        Your account
      </Text>
      <View>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.divider]}>
            <Text variant="label" style={styles.label}>
              {r.label}
            </Text>
            <Text variant="meta">{r.sub}</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  row: { paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  label: { marginBottom: 3 },
});
