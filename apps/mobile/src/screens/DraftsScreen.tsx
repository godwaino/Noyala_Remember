import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { MessageDraft } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Card } from "../components/Card";
import { LoadingState } from "../components/Skeleton";
import { BackButton, StatusChip } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { listDraftBatchesForUser } from "../data/messages";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

interface Batch {
  batchId: string;
  personId: string;
  drafts: MessageDraft[];
}

function groupByBatch(drafts: MessageDraft[]): Batch[] {
  const byBatch = new Map<string, Batch>();
  for (const d of drafts) {
    const meta = d.modelMetadata as { batchId?: string } | null;
    const batchId = meta?.batchId ?? d.id;
    const existing = byBatch.get(batchId);
    if (existing) existing.drafts.push(d);
    else byBatch.set(batchId, { batchId, personId: d.personId, drafts: [d] });
  }
  return Array.from(byBatch.values());
}

export function DraftsScreen({ navigation }: RootStackScreenProps<"Drafts">) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState<Batch[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      setLoading(true);
      listDraftBatchesForUser(user.id).then((drafts) => {
        setBatches(groupByBatch(drafts));
        setLoading(false);
      });
    }, [user]),
  );

  if (loading) return <LoadingState label="Loading drafts…" />;

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Drafts
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Prepared, never sent. A draft waits as long as you need.
      </Text>
      {batches.length === 0 ? (
        <Text variant="bodyMuted">Nothing waiting. Drafts appear here once you prepare a message.</Text>
      ) : (
        <View>
          {batches.map((b) => {
            const first = b.drafts[0];
            if (!first) return null;
            return (
              <Card
                key={b.batchId}
                onPress={() => navigation.navigate("Person", { personId: b.personId })}
                style={styles.card}
              >
                <View style={styles.cardHeader}>
                  <Text variant="label" style={styles.flex1}>
                    {b.drafts.length} {b.drafts.length === 1 ? "option" : "options"}
                  </Text>
                  <StatusChip label={first.generationStatus} tone={first.generationStatus === "succeeded" ? "sage" : "amber"} />
                </View>
                <Text variant="messageBody" style={styles.excerpt} numberOfLines={2}>
                  {first.content ?? "Not written yet."}
                </Text>
                <Text variant="meta">
                  {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(first.createdAt))}
                </Text>
              </Card>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  card: { marginBottom: spacing.smd },
  cardHeader: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", marginBottom: 10 },
  flex1: { flex: 1 },
  excerpt: { marginBottom: 10 },
});
