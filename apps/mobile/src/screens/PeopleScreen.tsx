import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { calendarDateInTimeZone, resolveUpcoming, RELATIONSHIP_TYPE_OPTIONS, type Person, type RelationshipType } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Field } from "../components/Field";
import { Button } from "../components/Button";
import { Chip, EmptyState } from "../components/primitives";
import { ListRow } from "../components/ListRow";
import { LoadingState } from "../components/Skeleton";
import { useAuth } from "../lib/auth";
import { useProfile } from "../lib/profile";
import { listPeople, initialsFor, displayName } from "../data/people";
import { listImportantDatesForUser } from "../data/dates";
import { spacing } from "../theme";
import type { TabScreenProps } from "../navigation/types";

export function PeopleScreen({ navigation }: TabScreenProps<"People">) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<Person[]>([]);
  const [whenByPerson, setWhenByPerson] = useState<Map<string, string>>(new Map());
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RelationshipType | "all">("all");

  const load = useCallback(async () => {
    if (!user || !profile) return;
    setLoading(true);
    const [list, dates] = await Promise.all([listPeople(user.id), listImportantDatesForUser(user.id)]);
    setPeople(list);
    const today = calendarDateInTimeZone(new Date(), profile.timezone);
    const resolved = resolveUpcoming(dates, (d) => d, today);
    const map = new Map<string, string>();
    for (const u of resolved) {
      if (!map.has(u.item.personId)) {
        map.set(u.item.personId, u.daysUntil === 0 ? "Today" : u.daysUntil === 1 ? "Tomorrow" : `${u.daysUntil}d`);
      }
    }
    setWhenByPerson(map);
    setLoading(false);
  }, [user, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    let list = people;
    if (filter !== "all") list = list.filter((p) => p.relationshipType === filter);
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.firstName.toLowerCase().includes(term) ||
          (p.lastName ?? "").toLowerCase().includes(term) ||
          (p.nickname ?? "").toLowerCase().includes(term),
      );
    }
    return list;
  }, [people, filter, search]);

  if (loading) return <LoadingState label="Loading people…" />;

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="screenTitle">People</Text>
        <Text variant="meta">
          {people.length} {people.length === 1 ? "person" : "people"}
        </Text>
      </View>

      <Field
        label="Search people"
        hideLabel
        value={search}
        onChangeText={setSearch}
        placeholder="Search a name, a relationship, a memory"
        style={styles.search}
      />

      <View style={styles.filters}>
        <Chip label="Everyone" active={filter === "all"} onPress={() => setFilter("all")} />
        {RELATIONSHIP_TYPE_OPTIONS.map((r) => (
          <Chip key={r.value} label={r.label} active={filter === r.value} onPress={() => setFilter(r.value)} />
        ))}
      </View>

      {people.length === 0 ? (
        <EmptyState
          title="Nobody here yet"
          body="Add the first person by hand, or pick a few from your contacts."
          primaryLabel="Add a person"
          onPrimary={() => navigation.navigate("AddPerson")}
          secondaryLabel="Choose from contacts"
          onSecondary={() => navigation.navigate("ImportContacts")}
        />
      ) : filtered.length === 0 ? (
        <View style={styles.noMatch}>
          <Text variant="bodyMuted" style={styles.noMatchText}>
            No match in this filter. Try Everyone, or add them as someone new.
          </Text>
          <Button label="Add a person" variant="secondary" fullWidth={false} onPress={() => navigation.navigate("AddPerson")} />
        </View>
      ) : (
        <View>
          {filtered.map((p, i) => (
            <ListRow
              key={p.id}
              initials={initialsFor(p)}
              title={displayName(p)}
              meta={RELATIONSHIP_TYPE_OPTIONS.find((r) => r.value === p.relationshipType)?.label}
              trailing={whenByPerson.get(p.id)}
              onPress={() => navigation.navigate("Person", { personId: p.id })}
              last={i === filtered.length - 1}
            />
          ))}
          <Button label="Add a person" variant="secondary" onPress={() => navigation.navigate("AddPerson")} style={styles.addMore} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: spacing.md },
  search: { marginBottom: spacing.sm },
  filters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: spacing.md },
  noMatch: { marginTop: spacing.sm },
  noMatchText: { marginBottom: spacing.md },
  addMore: { marginTop: spacing.lg },
});
