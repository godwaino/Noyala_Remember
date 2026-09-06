import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Consent } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { BackButton, SectionLabel } from "../components/primitives";
import { SwitchRow } from "../components/Switch";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../lib/auth";
import { listConsents, grantConsent, withdrawConsent, deleteAccount } from "../data/profile";
import { color, spacing, MIN_TAP } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function SettingsScreen({ navigation }: RootStackScreenProps<"Settings">) {
  const { user, signOut } = useAuth();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) listConsents(user.id).then(setConsents);
    }, [user]),
  );

  function isGranted(type: Consent["consentType"]): boolean {
    return consents.some((c) => c.consentType === type && !c.withdrawnAt);
  }

  async function toggleConsent(type: Consent["consentType"], next: boolean) {
    if (!user) return;
    if (next) {
      await grantConsent(user.id, type);
    } else {
      const existing = consents.find((c) => c.consentType === type && !c.withdrawnAt);
      if (existing) await withdrawConsent(existing.id);
    }
    setConsents(await listConsents(user.id));
  }

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Settings and privacy
      </Text>

      <SectionLabel>Account</SectionLabel>
      <Row label="Your account" sub={user?.email ?? ""} onPress={() => navigation.navigate("Account")} />

      <SectionLabel>Notifications</SectionLabel>
      <Row label="Reminders" sub="How far ahead, and how" onPress={() => navigation.navigate("Reminders")} />

      <SectionLabel>Privacy consents</SectionLabel>
      <View style={styles.section}>
        <SwitchRow
          label="Contact import"
          sub="Lets the import wizard read what your phone's picker hands back."
          value={isGranted("contact_import")}
          onValueChange={(v) => toggleConsent("contact_import", v)}
        />
        <SwitchRow
          label="Product updates"
          sub="Occasional email about new Noyala features."
          value={isGranted("marketing_updates")}
          onValueChange={(v) => toggleConsent("marketing_updates", v)}
          last
        />
      </View>

      <SectionLabel>Data</SectionLabel>
      <Text variant="meta" style={styles.exportNote}>
        Exporting your people, dates and memories as CSV/vCard is available from the Noyala web app
        (apps/web `/api/export/*`) — those routes need a browser session, not something this app can
        request on your behalf yet.
      </Text>

      <SectionLabel>Danger zone</SectionLabel>
      <Row label="Sign out" onPress={signOut} />
      <Row label="Delete my account" sub="Immediate and permanent — there is no grace period." danger onPress={() => setConfirmDeleteOpen(true)} last />

      <ConfirmDialog
        visible={confirmDeleteOpen}
        title="Delete your account?"
        body="This permanently deletes your account and everything in it right away. There is no 30-day grace period — this cannot be undone."
        confirmLabel={deleting ? "Deleting…" : "Delete permanently"}
        destructive
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={async () => {
          setDeleting(true);
          try {
            await deleteAccount();
          } finally {
            setDeleting(false);
            setConfirmDeleteOpen(false);
          }
        }}
      />
    </Screen>
  );
}

function Row({ label, sub, onPress, last, danger }: { label: string; sub?: string; onPress?: () => void; last?: boolean; danger?: boolean }) {
  return (
    <Pressable style={[styles.row, !last && styles.divider]} onPress={onPress}>
      <View style={styles.flex1}>
        <Text variant="label" style={danger ? styles.dangerLabel : undefined}>
          {label}
        </Text>
        {sub ? (
          <Text variant="meta" style={styles.rowSub}>
            {sub}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  exportNote: { marginBottom: spacing.lg },
  row: { minHeight: MIN_TAP + 8, justifyContent: "center", paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  flex1: { flex: 1, minWidth: 0 },
  rowSub: { marginTop: 3 },
  dangerLabel: { color: color.red },
});
