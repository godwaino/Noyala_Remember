import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { GiftIdea, GiftIdeaStatus, Person } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { LoadingState } from "../components/Skeleton";
import { BackButton, Chip, StatusChip } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { listMyCircles } from "../data/circles";
import { listGiftIdeasForCircle, setGiftIdeaStatus } from "../data/gifts";
import { listPeople, displayName } from "../data/people";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const FILTERS: { value: GiftIdeaStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "idea", label: "Idea" },
  { value: "planned", label: "Planned" },
  { value: "purchased", label: "Purchased" },
  { value: "given", label: "Given" },
];

const NEXT_STATUS: Record<GiftIdeaStatus, GiftIdeaStatus | null> = {
  idea: "planned",
  planned: "purchased",
  purchased: "given",
  given: null,
};

export function GiftsScreen({}: RootStackScreenProps<"Gifts">) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<GiftIdea[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [filter, setFilter] = useState<GiftIdeaStatus | "all">("all");
  const [hasCircles, setHasCircles] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [circles, peopleList] = await Promise.all([listMyCircles(), listPeople(user.id)]);
    setPeople(new Map(peopleList.map((p) => [p.id, p])));
    setHasCircles(circles.length > 0);
    const all = (await Promise.all(circles.map((c) => listGiftIdeasForCircle(c.id)))).flat();
    setGifts(all);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingState label="Loading gifts…" />;

  const filtered = filter === "all" ? gifts : gifts.filter((g) => g.status === filter);

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Gifts
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Shared across the circles you belong to. A gift about you, in a circle where you're the linked
        member, is always hidden from your own view — that protection is automatic, not a setting.
      </Text>

      {!hasCircles ? (
        <Text variant="bodyMuted">Create a circle first — gift ideas are shared inside one.</Text>
      ) : (
        <View>
          <View style={styles.filters}>
            {FILTERS.map((f) => (
              <Chip key={f.value} label={f.label} active={filter === f.value} onPress={() => setFilter(f.value)} />
            ))}
          </View>

          {filtered.length === 0 ? (
            <Text variant="bodyMuted">Nothing in this filter.</Text>
          ) : (
            filtered.map((g) => {
              const person = people.get(g.personId);
              const next = NEXT_STATUS[g.status];
              return (
                <Card key={g.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.flex1}>
                      <Text variant="cardTitle" style={styles.giftTitle}>
                        {g.title}
                      </Text>
                      <Text variant="meta">
                        {person ? displayName(person) : "Someone in this circle"}
                        {g.budgetAmount !== null ? ` · ${g.budgetCurrency} ${g.budgetAmount}` : ""}
                      </Text>
                    </View>
                    <StatusChip label={g.status} tone={g.status === "given" ? "sage" : "neutral"} />
                  </View>
                  {next ? (
                    <Button
                      label={`Mark ${next}`}
                      variant="secondary"
                      fullWidth={false}
                      onPress={async () => {
                        await setGiftIdeaStatus(g.id, next);
                        load();
                      }}
                    />
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: spacing.md },
  card: { marginBottom: spacing.smd },
  cardHeader: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", marginBottom: spacing.sm },
  flex1: { flex: 1, minWidth: 0 },
  giftTitle: { marginBottom: 4 },
});
