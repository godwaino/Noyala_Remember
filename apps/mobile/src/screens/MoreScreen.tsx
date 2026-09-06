import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { color, spacing, MIN_TAP } from "../theme";
import type { TabScreenProps } from "../navigation/types";

const ROWS: { label: string; sub: string; route: "Drafts" | "History" | "Gifts" | "Circles" | "Reminders" | "Plan" | "Settings" }[] = [
  { label: "Drafts", sub: "Prepared, never sent", route: "Drafts" },
  { label: "Message history", sub: "What you did with each draft", route: "History" },
  { label: "Gifts", sub: "Ideas, budgets, surprise mode", route: "Gifts" },
  { label: "Circles", sub: "Shared spaces for the people you trust", route: "Circles" },
  { label: "Reminders", sub: "How far ahead, and how", route: "Reminders" },
  { label: "Noyala Quiet", sub: "Nothing about your data is behind a paywall", route: "Plan" },
  { label: "Settings and privacy", sub: "Account, export, deletion", route: "Settings" },
];

export function MoreScreen({ navigation }: TabScreenProps<"More">) {
  return (
    <Screen>
      <Text variant="screenTitle" style={styles.title}>
        More
      </Text>
      <View>
        {ROWS.map((r, i) => (
          <Pressable
            key={r.route}
            style={[styles.row, i < ROWS.length - 1 && styles.divider]}
            onPress={() => navigation.navigate(r.route)}
          >
            <View style={styles.flex1}>
              <Text variant="label">{r.label}</Text>
              <Text variant="meta" style={styles.sub}>
                {r.sub}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    minHeight: MIN_TAP + 8,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  flex1: { flex: 1, minWidth: 0 },
  sub: { marginTop: 3 },
  chevron: { color: "#B0A79F", fontSize: 17 },
});
