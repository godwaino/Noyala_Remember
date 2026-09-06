import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { ageAtOccurrence, calendarDateInTimeZone, nextOccurrence, type ImportantDate, type Interaction, type Memory, type Person } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { LoadingState } from "../components/Skeleton";
import { BackButton, SectionLabel } from "../components/primitives";
import { useProfile } from "../lib/profile";
import { getImportantDate } from "../data/dates";
import { getPerson, displayName } from "../data/people";
import { listMemoriesForPerson } from "../data/memories";
import { listInteractionsForPerson } from "../data/interactions";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function OccasionScreen({ route, navigation }: RootStackScreenProps<"Occasion">) {
  const { importantDateId } = route.params;
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<ImportantDate | null>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [history, setHistory] = useState<Interaction[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const d = await getImportantDate(importantDateId);
    setDate(d);
    if (d) {
      const [p, m, h] = await Promise.all([
        getPerson(d.personId),
        listMemoriesForPerson(d.personId),
        listInteractionsForPerson(d.personId),
      ]);
      setPerson(p);
      setMemories(m.filter((x) => x.sensitivity === "standard"));
      setHistory(h.slice(0, 3));
    }
    setLoading(false);
  }, [importantDateId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !date || !person || !profile) return <LoadingState label="Loading…" />;

  const today = calendarDateInTimeZone(new Date(), profile.timezone);
  const occurrence = nextOccurrence(date, today);
  const age = occurrence ? ageAtOccurrence(date.year, occurrence) : null;
  const daysUntil = occurrence
    ? Math.round(
        (Date.UTC(occurrence.year, occurrence.month - 1, occurrence.day) - Date.UTC(today.year, today.month - 1, today.day)) /
          86400000,
      )
    : null;

  return (
    <Screen>
      <BackButton />
      <SectionLabel clay>{daysUntil === 0 ? "Today" : daysUntil ? `In ${daysUntil} days` : ""}</SectionLabel>
      <Text variant="heroTitle" style={styles.title}>
        {displayName(person)}'s {date.label.toLowerCase()}
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        {age !== null ? `Turning ${age}.` : `${displayName(person)}'s birthday is ${daysUntil === 0 ? "today" : "coming up"}.`}
      </Text>

      <SectionLabel>What you know</SectionLabel>
      <View style={styles.section}>
        {memories.length === 0 ? (
          <Text variant="bodyMuted">No notes saved for {displayName(person)} yet.</Text>
        ) : (
          memories.slice(0, 4).map((m) => (
            <View key={m.id} style={styles.memoryRow}>
              <View style={styles.dot} />
              <Text variant="memoryBody" style={styles.flex1}>
                {m.content}
              </Text>
            </View>
          ))
        )}
      </View>

      <SectionLabel>Recently</SectionLabel>
      <View style={styles.section}>
        {history.length === 0 ? (
          <Text variant="bodyMuted">Nothing logged yet.</Text>
        ) : (
          history.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <Text variant="metaStrong">
                {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(h.occurredAt))} · {h.type}
              </Text>
              <Text variant="body">{h.summary ?? "No details noted."}</Text>
            </View>
          ))
        )}
      </View>

      <Button label="Prepare a message" onPress={() => navigation.navigate("MessageStudio", { personId: person.id, importantDateId })} style={styles.gap} />
      <Button label="View full profile" variant="secondary" onPress={() => navigation.navigate("Person", { personId: person.id })} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  memoryRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 10 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.peach, marginTop: 9 },
  flex1: { flex: 1 },
  historyRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: color.hairline },
  gap: { marginBottom: spacing.sm },
});
