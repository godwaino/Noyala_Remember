import React, { useState } from "react";
import { StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";
import * as Contacts from "expo-contacts";
import { StaticScreen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { SectionLabel } from "../../components/primitives";
import { useAuth } from "../../lib/auth";
import { useProfile } from "../../lib/profile";
import { completeOnboarding } from "../../data/profile";
import { spacing, color } from "../../theme";
import type { AuthStackScreenProps } from "../../navigation/types";

/**
 * Both optional, both explained before being asked — nothing here fires a
 * permission prompt just from this screen mounting. Requesting the OS
 * notification permission is real; actually registering a device push
 * token with a backend table is a separate, well-scoped follow-up (see
 * docs/roadmap.md's "Native-push adapter" note, previously blocked only on
 * apps/mobile not existing) — this screen doesn't claim to do more than it
 * does.
 *
 * Onboarding is only written to `profiles` here, at the very end — not in
 * ProfileSetupScreen — so RootNavigator (which switches to the app once
 * `profile.onboardingCompletedAt` is set) doesn't swap this screen out
 * from under the user before they've seen it.
 */
export function PermissionsScreen({ route }: AuthStackScreenProps<"Permissions">) {
  const { draft } = route.params;
  const { user } = useAuth();
  const { refresh } = useProfile();
  const [pushStatus, setPushStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function askPush() {
    const { status } = await Notifications.requestPermissionsAsync();
    setPushStatus(status === "granted" ? "granted" : "denied");
  }

  async function finish() {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await completeOnboarding(user.id, draft);
      await refresh();
      // RootNavigator swaps to the app automatically once the refreshed
      // profile has onboarding_completed_at set.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't finish setting up your account.");
      setBusy(false);
    }
  }

  async function askContactsThenFinish() {
    await Contacts.requestPermissionsAsync();
    await finish();
  }

  return (
    <StaticScreen>
      <SectionLabel clay>Step 3 of 3</SectionLabel>
      <Text variant="screenTitle" style={styles.title}>
        Two permissions, both optional
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        You can add everyone by hand and grant neither. Nothing leaves your phone unless you choose it.
      </Text>

      <Card style={styles.card}>
        <Text variant="label" style={styles.cardTitle}>
          Reminders
        </Text>
        <Text variant="meta" style={styles.cardBody}>
          One notification in the morning listing what's coming. Never a nudge to open the app.
        </Text>
        <Button
          label={pushStatus === "granted" ? "Allowed" : pushStatus === "denied" ? "Not allowed" : "Allow reminders"}
          variant="secondary"
          disabled={pushStatus !== "idle"}
          onPress={askPush}
          fullWidth={false}
        />
      </Card>

      <Card>
        <Text variant="label" style={styles.cardTitle}>
          Contacts
        </Text>
        <Text variant="meta" style={styles.cardBody}>
          Your phone's own picker hands back only the people you choose. Noyala never reads the whole
          address book.
        </Text>
        <Button label="Decide later" variant="secondary" onPress={finish} disabled={busy} fullWidth={false} />
      </Card>

      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? "Opening…" : "Open Noyala"} onPress={askContactsThenFinish} disabled={busy} style={styles.open} />
    </StaticScreen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.smd },
  cardTitle: { marginBottom: 6 },
  cardBody: { marginBottom: 14 },
  error: { color: color.red, marginTop: spacing.sm },
  open: { marginTop: spacing.lg },
});
