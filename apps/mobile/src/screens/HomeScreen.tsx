import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Path, Circle, Rect } from "react-native-svg";
import type { Memory } from "@noyala/domain";
import { Screen, StaticScreen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { LoadingState } from "../components/Skeleton";
import { EmptyState, SectionLabel, ThreadRow, Avatar } from "../components/primitives";
import { ListRow } from "../components/ListRow";
import { Card } from "../components/Card";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { loadHomeFeed, type UpcomingOccasion, type ReconnectSuggestion } from "../data/home";
import { listMemoriesForPerson } from "../data/memories";
import { setFollowUpStatus } from "../data/interactions";
import { snoozeReconnect } from "../data/people";
import { initialsFor, displayName as personDisplayName } from "../data/people";
import { color, spacing } from "../theme";
import type { TabScreenProps } from "../navigation/types";

const WEEKDAY_MONTH = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" });

function formatWhen(daysUntil: number, occurrence: { year: number; month: number; day: number }): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil <= 6) return `In ${daysUntil} days`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(
    new Date(occurrence.year, occurrence.month - 1, occurrence.day),
  );
}

export function HomeScreen({ navigation }: TabScreenProps<"Home">) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState<UpcomingOccasion | null>(null);
  const [heroMemories, setHeroMemories] = useState<Memory[]>([]);
  const [rest, setRest] = useState<UpcomingOccasion[]>([]);
  const [reconnect, setReconnect] = useState<ReconnectSuggestion[]>([]);
  const [followUps, setFollowUps] = useState<Awaited<ReturnType<typeof loadHomeFeed>>["followUps"]>([]);
  const [peopleCount, setPeopleCount] = useState(0);

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    const feed = await loadHomeFeed(user.id, profile.timezone, new Date());
    setPeopleCount(feed.peopleById.size);
    const [first, ...others] = feed.upcoming;
    setHero(first ?? null);
    setRest(others);
    setReconnect(feed.reconnect);
    setFollowUps(feed.followUps);
    if (first) {
      setHeroMemories((await listMemoriesForPerson(first.person.id)).filter((m) => m.sensitivity === "standard"));
    } else {
      setHeroMemories([]);
    }
    setLoading(false);
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!profile) return <LoadingState label="Catching up on today…" />;
  if (loading) return <LoadingState label="Catching up on today…" />;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  if (peopleCount === 0) {
    return (
      <StaticScreen>
        <Header profile={profile} />
        <EmptyState
          title="Start with one person"
          body="Someone you'd hate to let down. A name is enough — a date, a note and the rest can follow whenever you like."
          primaryLabel="Add a person"
          onPrimary={() => navigation.navigate("AddPerson")}
          secondaryLabel="Choose from contacts"
          onSecondary={() => navigation.navigate("ImportContacts")}
        />
        <Text variant="meta" style={styles.honest}>
          An empty screen is the honest one. Noyala won't invent people or dates to look busy.
        </Text>
      </StaticScreen>
    );
  }

  return (
    <Screen>
      <Header profile={profile} />
      <Text variant="eyebrow" style={styles.today}>
        {WEEKDAY_MONTH.format(new Date()).toUpperCase()}
      </Text>
      <Text variant="screenTitle" style={styles.greeting}>
        {greeting}
        {profile.displayName ? `, ${profile.displayName}` : ""}
      </Text>

      {hero ? (
        <ThreadRow>
          <SectionLabel clay>{formatWhen(hero.daysUntil, hero.occurrence)}</SectionLabel>
          <Text variant="heroTitle" style={styles.heroTitle}>
            {personDisplayName(hero.person)}'s {hero.item.label.toLowerCase()}
          </Text>
          <Text variant="bodyMuted" style={styles.heroSub}>
            {hero.age !== null
              ? `Turning ${hero.age}.`
              : `${personDisplayName(hero.person)}'s ${hero.item.label.toLowerCase()} is ${
                  hero.daysUntil === 0 ? "today" : "coming up"
                }.`}
          </Text>
          {heroMemories.slice(0, 2).map((m) => (
            <View key={m.id} style={styles.heroMemory}>
              <View style={styles.heroDot} />
              <Text variant="memoryBody" style={styles.heroMemoryText}>
                {m.content}
              </Text>
            </View>
          ))}
          <View style={styles.heroActions}>
            <Button
              label="Prepare a message"
              fullWidth={false}
              onPress={() => navigation.navigate("MessageStudio", { personId: hero.person.id, importantDateId: hero.item.id })}
            />
            <Button
              label="View profile"
              variant="text"
              fullWidth={false}
              onPress={() => navigation.navigate("Person", { personId: hero.person.id })}
            />
          </View>
        </ThreadRow>
      ) : null}

      <View style={styles.divider} />

      {followUps.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>Follow-ups you noted</SectionLabel>
          {followUps.map((f) => (
            <View key={f.id} style={styles.followUpRow}>
              <Text variant="body">{f.description}</Text>
              {f.dueAt ? (
                <Text variant="meta" style={styles.followUpMeta}>
                  Due {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(f.dueAt))}
                </Text>
              ) : null}
              <View style={styles.followUpActions}>
                <Button
                  label="Mark done"
                  variant="secondary"
                  fullWidth={false}
                  onPress={async () => {
                    await setFollowUpStatus(f.id, "completed");
                    load();
                  }}
                />
                <Button
                  label="Dismiss"
                  variant="text"
                  fullWidth={false}
                  onPress={async () => {
                    await setFollowUpStatus(f.id, "dismissed");
                    load();
                  }}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <SectionLabel>Coming up</SectionLabel>
      <View style={styles.section}>
        {rest.length === 0 && !hero ? (
          <Text variant="bodyMuted">Nothing else on the horizon yet.</Text>
        ) : (
          rest.slice(0, 6).map((u, i) => (
            <ListRow
              key={u.item.id}
              initials={initialsFor(u.person)}
              title={`${personDisplayName(u.person)} — ${u.item.label}`}
              meta={u.age !== null ? `Turning ${u.age}` : undefined}
              trailing={formatWhen(u.daysUntil, u.occurrence)}
              onPress={() => navigation.navigate("Occasion", { importantDateId: u.item.id })}
              last={i === Math.min(rest.length, 6) - 1}
            />
          ))
        )}
      </View>

      {reconnect.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>On your own cadence</SectionLabel>
          <Text variant="meta" style={styles.reconnectNote}>
            Only the interval you set, stated plainly. Nothing is scored, and every one of these can be
            dismissed.
          </Text>
          {reconnect.map((r) => (
            <Card key={r.person.id} style={styles.reconnectCard}>
              <Text variant="nameLg" style={styles.reconnectName}>
                {personDisplayName(r.person)}
              </Text>
              <Text variant="meta" style={styles.reconnectMeta}>
                {r.daysSinceLastInteraction !== null
                  ? `Last connection recorded ${r.daysSinceLastInteraction} days ago`
                  : "No connection recorded yet"}
              </Text>
              <View style={styles.followUpActions}>
                <Button
                  label="Review and prepare"
                  variant="secondary"
                  fullWidth={false}
                  onPress={() => navigation.navigate("Person", { personId: r.person.id })}
                />
                <Button
                  label="Snooze"
                  variant="text"
                  fullWidth={false}
                  onPress={async () => {
                    const until = new Date();
                    until.setDate(until.getDate() + 14);
                    await snoozeReconnect(r.person.id, until.toISOString());
                    load();
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.divider} />
      <Pressable style={styles.voiceRow} onPress={() => navigation.navigate("VoiceCapture", {})}>
        <View style={styles.voiceIcon}>
          <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={color.clay} strokeWidth={1.6} strokeLinecap="round">
            <Rect x={9} y={2.5} width={6} height={11.5} rx={3} />
            <Path d="M5 11a7 7 0 0 0 14 0M12 18v3.5" />
          </Svg>
        </View>
        <View style={styles.flex1}>
          <Text variant="label">Capture a memory</Text>
          <Text variant="meta" style={styles.voiceSub}>
            Speak it now, review it later
          </Text>
        </View>
      </Pressable>
    </Screen>
  );
}

function Header({ profile }: { profile: { displayName: string } }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Svg width={22} height={22} viewBox="0 0 32 32" fill="none">
          <Path d="M7 25V11.5c0-3 2.2-5 5-5s5 2 5 5V21c0 3 2.2 5 5 5s5-2 5-5V7.5" stroke={color.clay} strokeWidth={2.6} strokeLinecap="round" />
          <Circle cx={7} cy={7.2} r={2.3} fill={color.clay} />
        </Svg>
        <Text variant="brandWordmark">Noyala</Text>
      </View>
      <Avatar initials={profile.displayName.slice(0, 2).toUpperCase() || "?"} size={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.lg },
  brand: { flexDirection: "row", alignItems: "center", gap: 9 },
  today: { marginBottom: spacing.sm },
  greeting: { marginBottom: spacing.lg },
  heroTitle: { marginBottom: 8 },
  heroSub: { marginBottom: spacing.md },
  heroMemory: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginBottom: 8 },
  heroDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: color.peach, marginTop: 9 },
  heroMemoryText: { flex: 1 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center", marginTop: spacing.sm },
  divider: { height: 1, backgroundColor: color.hairline, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  followUpRow: { marginBottom: spacing.md },
  followUpMeta: { marginTop: 2, marginBottom: spacing.sm },
  followUpActions: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: spacing.sm },
  reconnectNote: { marginBottom: spacing.md },
  reconnectCard: { marginBottom: spacing.smd },
  reconnectName: { marginBottom: 6 },
  reconnectMeta: { marginBottom: spacing.sm },
  voiceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    minHeight: 60,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  voiceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceSub: { marginTop: 3 },
  flex1: { flex: 1 },
  honest: { marginTop: spacing.lg },
});
