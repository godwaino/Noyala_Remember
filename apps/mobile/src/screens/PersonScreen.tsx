import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { calendarDateInTimeZone, resolveUpcoming, RELATIONSHIP_TYPE_OPTIONS, type FollowUp, type GiftIdea, type ImportantDate, type Interaction, type Memory, type Person } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { LoadingState } from "../components/Skeleton";
import { Avatar, BackButton, Chip, SectionLabel, StatusChip, ThreadRow } from "../components/primitives";
import { useProfile } from "../lib/profile";
import { getPerson, initialsFor, displayName } from "../data/people";
import { listImportantDatesForPerson } from "../data/dates";
import { listMemoriesForPerson } from "../data/memories";
import { listInteractionsForPerson, listFollowUpsForPerson } from "../data/interactions";
import { listGiftIdeasForPerson } from "../data/gifts";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

type TabKey = "overview" | "memories" | "timeline" | "gifts";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "memories", label: "Memories" },
  { key: "timeline", label: "Timeline" },
  { key: "gifts", label: "Gifts" },
];

export function PersonScreen({ route, navigation }: RootStackScreenProps<"Person">) {
  const { personId } = route.params;
  const { profile } = useProfile();
  const [tab, setTab] = useState<TabKey>(route.params.tab ?? "overview");
  const [loading, setLoading] = useState(true);
  const [person, setPerson] = useState<Person | null>(null);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [timeline, setTimeline] = useState<Interaction[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [gifts, setGifts] = useState<GiftIdea[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const [p, d, m, t, f, g] = await Promise.all([
      getPerson(personId),
      listImportantDatesForPerson(personId),
      listMemoriesForPerson(personId),
      listInteractionsForPerson(personId),
      listFollowUpsForPerson(personId),
      listGiftIdeasForPerson(personId),
    ]);
    setPerson(p);
    setDates(d);
    setMemories(m);
    setTimeline(t);
    setFollowUps(f.filter((x) => x.status === "open"));
    setGifts(g);
    setLoading(false);
  }, [personId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !person || !profile) return <LoadingState label="Loading…" />;

  const today = calendarDateInTimeZone(new Date(), profile.timezone);
  const upcoming = resolveUpcoming(dates, (d) => d, today);
  const next = upcoming[0];
  const nextLine = next
    ? next.age !== null
      ? `${next.item.label} in ${next.daysUntil === 0 ? "0 days — today" : `${next.daysUntil} days`}. Turning ${next.age}.`
      : `${next.item.label} ${next.daysUntil === 0 ? "is today" : `in ${next.daysUntil} days`}.`
    : "No dates saved yet.";

  return (
    <Screen>
      <BackButton />
      <View style={styles.headerRow}>
        <Avatar initials={initialsFor(person)} size={54} />
        <View style={styles.flex1}>
          <Text variant="sectionTitle">{displayName(person)}</Text>
          <Text variant="meta">{RELATIONSHIP_TYPE_OPTIONS.find((r) => r.value === person.relationshipType)?.label}</Text>
        </View>
      </View>
      <Text variant="body" style={styles.nextLine}>
        {nextLine}
      </Text>
      <View style={styles.actions}>
        <Button
          label="Prepare a message"
          fullWidth={false}
          onPress={() => navigation.navigate("MessageStudio", { personId, importantDateId: next?.item.id })}
        />
        <Button label="Log a connection" variant="secondary" fullWidth={false} onPress={() => navigation.navigate("LogConnection", { personId })} />
      </View>

      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {tab === "overview" ? (
        <View>
          <SectionLabel>Dates</SectionLabel>
          <View style={styles.section}>
            {dates.length === 0 ? (
              <Text variant="bodyMuted">No dates saved yet.</Text>
            ) : (
              dates.map((d) => (
                <View key={d.id} style={styles.dateRow}>
                  <View style={styles.flex1}>
                    <Text variant="label">{d.label}</Text>
                    <Text variant="meta" style={styles.dateSub}>
                      {monthName(d.month)} {d.day}
                      {d.year ? `, ${d.year}` : ""}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <SectionLabel>Cadence</SectionLabel>
          <Text variant="bodyMuted" style={styles.cadenceText}>
            {person.reconnectCadenceDays
              ? `You've asked to reconnect roughly every ${person.reconnectCadenceDays} days.`
              : "No cadence set — Noyala won't suggest reconnecting."}
          </Text>

          {followUps.length > 0 ? (
            <>
              <SectionLabel>Follow-ups</SectionLabel>
              <View style={styles.section}>
                {followUps.map((f) => (
                  <Card key={f.id} style={styles.followUpCard}>
                    <Text variant="body">{f.description}</Text>
                  </Card>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.stack}>
            <Button label="Add a memory" variant="secondary" onPress={() => navigation.navigate("AddMemory", { personId })} />
            <Button label="Capture a memory by voice" variant="secondary" onPress={() => navigation.navigate("VoiceCapture", { personId })} />
            <Button label="Sharing" variant="secondary" onPress={() => navigation.navigate("Share", { personId })} />
          </View>
        </View>
      ) : null}

      {tab === "memories" ? (
        <View>
          <Text variant="meta" style={styles.memoriesIntro}>
            Ordinary notes can inform a draft. Private ones never do.
          </Text>
          <View style={styles.section}>
            {memories.length === 0 ? (
              <Text variant="bodyMuted">No memories yet.</Text>
            ) : (
              memories.map((m) => (
                <Card key={m.id} style={styles.memoryCard}>
                  <Text variant="memoryBody" style={styles.memoryText}>
                    {m.content}
                  </Text>
                  <View style={styles.memoryTags}>
                    <StatusChip label={m.category} />
                    {m.sensitivity === "sensitive" ? <StatusChip label="Private" tone="amber" /> : null}
                  </View>
                </Card>
              ))
            )}
          </View>
          <Button label="Add a memory" onPress={() => navigation.navigate("AddMemory", { personId })} />
        </View>
      ) : null}

      {tab === "timeline" ? (
        <View>
          {timeline.length === 0 ? (
            <Text variant="bodyMuted" style={styles.memoriesIntro}>
              Nothing logged yet. A connection is only recorded when you say so.
            </Text>
          ) : (
            timeline.map((t, i) => (
              <ThreadRow key={t.id} last={i === timeline.length - 1}>
                <Text variant="metaStrong">
                  {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(t.occurredAt))} · {t.type}
                </Text>
                <Text variant="memoryBody">{t.summary ?? "No details noted."}</Text>
              </ThreadRow>
            ))
          )}
          <Button label="Log a connection" variant="secondary" onPress={() => navigation.navigate("LogConnection", { personId })} />
        </View>
      ) : null}

      {tab === "gifts" ? (
        <View>
          {gifts.length === 0 ? (
            <Text variant="bodyMuted" style={styles.memoriesIntro}>
              No gift ideas noted. This list is private, even inside a circle.
            </Text>
          ) : (
            <View style={styles.section}>
              {gifts.map((g) => (
                <Card key={g.id} style={styles.giftCard}>
                  <View style={styles.flex1}>
                    <Text variant="cardTitle" style={styles.giftTitle}>
                      {g.title}
                    </Text>
                    {g.budgetAmount !== null ? (
                      <Text variant="meta">
                        {g.budgetCurrency} {g.budgetAmount}
                      </Text>
                    ) : null}
                  </View>
                  <StatusChip label={g.status} tone={g.status === "given" ? "sage" : "neutral"} />
                </Card>
              ))}
            </View>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

function monthName(month: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2020, month - 1, 1));
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", gap: spacing.smd, alignItems: "center", marginBottom: spacing.md },
  flex1: { flex: 1, minWidth: 0 },
  nextLine: { marginBottom: spacing.md, color: color.ink },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.lg },
  tabBar: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  dateRow: { flexDirection: "row", paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: color.hairline },
  dateSub: { marginTop: 3 },
  cadenceText: { marginBottom: spacing.lg },
  followUpCard: { marginBottom: spacing.sm },
  stack: { gap: spacing.sm },
  memoriesIntro: { marginBottom: spacing.md },
  memoryCard: { marginBottom: spacing.smd },
  memoryText: { marginBottom: 10 },
  memoryTags: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  giftCard: { flexDirection: "row", gap: spacing.smd, alignItems: "flex-start", marginBottom: spacing.smd },
  giftTitle: { marginBottom: 4 },
});
