import React from "react";
import { StyleSheet } from "react-native";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Card } from "../components/Card";
import { BackButton } from "../components/primitives";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

/**
 * The design mocks a plan-switcher here ("Noyala Quiet" vs a paid tier).
 * There is no billing/entitlements system in this codebase yet — Stage 8
 * was deliberately skipped (see docs/roadmap.md) — so this screen says
 * that plainly rather than rendering a plan card and an "Upgrade" button
 * that would submit nowhere real.
 */
export function PlanScreen({}: RootStackScreenProps<"Plan">) {
  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Noyala Quiet
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Nothing about your own data is behind a paywall — account and data export, account deletion,
        withdrawing consent and accessibility settings are always free, for every user.
      </Text>
      <Card>
        <Text variant="label" style={styles.cardTitle}>
          No paid plan yet
        </Text>
        <Text variant="meta">
          Noyala doesn't have a billing system today. If that changes, it will never affect the controls
          listed above.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  cardTitle: { marginBottom: 6 },
});
