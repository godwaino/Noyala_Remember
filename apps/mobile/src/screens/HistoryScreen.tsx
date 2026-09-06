import React, { useCallback, useState } from "react";
import { StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { MessageHistoryEntry } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { LoadingState } from "../components/Skeleton";
import { BackButton, ThreadRow } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { listHistoryForUser } from "../data/messages";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const ACTION_LABEL: Record<MessageHistoryEntry["action"], string> = {
  copied: "Copied",
  opened_in_app: "Opened in app",
  marked_sent: "Marked sent",
};

export function HistoryScreen({}: RootStackScreenProps<"History">) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<MessageHistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      listHistoryForUser(user.id).then((rows) => {
        setEntries(rows);
        setLoading(false);
      });
    }, [user]),
  );

  if (loading) return <LoadingState label="Loading history…" />;

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Message history
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        What you did with each draft. Never a delivery receipt.
      </Text>
      {entries.length === 0 ? (
        <Text variant="bodyMuted">Nothing here yet.</Text>
      ) : (
        entries.map((h, i) => (
          <ThreadRow key={h.id} last={i === entries.length - 1}>
            <Text variant="metaStrong">
              {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(h.actedAt))}
            </Text>
            <Text variant="eyebrowClay" style={styles.action}>
              {ACTION_LABEL[h.action]} · {h.channel}
            </Text>
            <Text variant="body">{h.finalContent}</Text>
          </ThreadRow>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  action: { marginVertical: 4 },
});
