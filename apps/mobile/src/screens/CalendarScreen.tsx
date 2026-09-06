import React, { useCallback, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { resolveObservedDate, type ImportantDate, type Person } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { LoadingState } from "../components/Skeleton";
import { ListRow } from "../components/ListRow";
import { useAuth } from "../lib/auth";
import { listPeople, initialsFor, displayName } from "../data/people";
import { listImportantDatesForUser } from "../data/dates";
import { color, spacing } from "../theme";
import type { TabScreenProps } from "../navigation/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

interface Cell {
  date: Date;
  inMonth: boolean;
  hasOccasion: boolean;
  isToday: boolean;
}

function buildMonthGrid(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const start = new Date(year, month, 1 - startWeekday);
  const today = new Date();
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date: d,
      inMonth: d.getMonth() === month,
      hasOccasion: false,
      isToday: d.toDateString() === today.toDateString(),
    });
  }
  return cells;
}

export function CalendarScreen({ navigation }: TabScreenProps<"Calendar">) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [people, setPeople] = useState<Map<string, Person>>(new Map());
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<Date>(new Date());

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [d, p] = await Promise.all([listImportantDatesForUser(user.id), listPeople(user.id)]);
    setDates(d);
    setPeople(new Map(p.map((x) => [x.id, x])));
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Occurrences that fall on a specific calendar day, honouring the same
   * leap-day observance policy every other screen uses. */
  const occurrencesOn = useCallback(
    (day: Date) => {
      return dates.filter((d) => {
        if (d.recursAnnually) {
          const observed = resolveObservedDate(d.month, d.day, day.getFullYear());
          return observed.month === day.getMonth() + 1 && observed.day === day.getDate();
        }
        return d.year === day.getFullYear() && d.month === day.getMonth() + 1 && d.day === day.getDate();
      });
    },
    [dates],
  );

  const cells = useMemo(() => {
    const grid = buildMonthGrid(cursor.year, cursor.month);
    return grid.map((c) => ({ ...c, hasOccasion: occurrencesOn(c.date).length > 0 }));
  }, [cursor, occurrencesOn]);

  const agenda = useMemo(() => occurrencesOn(selected), [occurrencesOn, selected]);

  if (loading) return <LoadingState label="Loading calendar…" />;

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    new Date(cursor.year, cursor.month, 1),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="sectionTitle">{monthLabel}</Text>
        <View style={styles.navButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={styles.navButton}
            onPress={() => setCursor((c) => normalizeMonth(c.year, c.month - 1))}
          >
            <Text variant="label">‹</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={styles.navButton}
            onPress={() => setCursor((c) => normalizeMonth(c.year, c.month + 1))}
          >
            <Text variant="label">›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdays}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} variant="metaStrong" style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c, i) => {
          const isSelected = c.date.toDateString() === selected.toDateString();
          return (
            <Pressable
              key={i}
              onPress={() => setSelected(c.date)}
              style={[styles.cell, isSelected && styles.cellSelected]}
            >
              <Text variant="body" style={!c.inMonth ? styles.cellMuted : c.isToday ? styles.cellToday : undefined}>
                {c.date.getDate()}
              </Text>
              {c.hasOccasion ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text variant="eyebrow" style={styles.agendaLabel}>
        {new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(selected).toUpperCase()}
      </Text>
      {agenda.length === 0 ? (
        <Text variant="bodyMuted">Nothing on this day. An empty day is a real answer.</Text>
      ) : (
        agenda.map((d, i) => {
          const person = people.get(d.personId);
          if (!person) return null;
          return (
            <ListRow
              key={d.id}
              initials={initialsFor(person)}
              title={`${displayName(person)} — ${d.label}`}
              onPress={() => navigation.navigate("Occasion", { importantDateId: d.id })}
              last={i === agenda.length - 1}
            />
          );
        })
      )}
    </Screen>
  );
}

function normalizeMonth(year: number, month: number): { year: number; month: number } {
  if (month < 0) return { year: year - 1, month: 11 };
  if (month > 11) return { year: year + 1, month: 0 };
  return { year, month };
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  navButtons: { flexDirection: "row", gap: 6 },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  weekdays: { flexDirection: "row", marginBottom: 6 },
  weekday: { flex: 1, textAlign: "center", paddingVertical: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  cellSelected: { backgroundColor: color.wash },
  cellMuted: { color: color.disabledSurface },
  cellToday: { color: color.clay, fontWeight: "700" },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: color.clay, marginTop: 2 },
  dotSelected: { backgroundColor: color.action },
  agendaLabel: { marginBottom: spacing.md },
});
