import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { RELATIONSHIP_TYPE_OPTIONS, type RelationshipType } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { BackButton, Chip } from "../components/primitives";
import { useAuth } from "../lib/auth";
import { createPerson } from "../data/people";
import { createImportantDate } from "../data/dates";
import { color, spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AddPersonScreen({ navigation }: RootStackScreenProps<"AddPerson">) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<RelationshipType>("other");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState(9);
  const [year, setYear] = useState("");
  const [yearUnknown, setYearUnknown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSave() {
    if (!user) return;
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const person = await createPerson(user.id, {
        firstName: name.trim(),
        relationshipType: relationship,
        reconnectCadenceDays: null,
      });
      const dayNum = Number(day);
      if (day.trim() && dayNum >= 1 && dayNum <= 31) {
        await createImportantDate(user.id, person.id, {
          type: "birthday",
          label: "Birthday",
          month: month + 1,
          day: dayNum,
          year: yearUnknown ? null : year.trim() ? Number(year) : null,
          recursAnnually: true,
          reminderOffsets: [14, 7, 1, 0],
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
      navigation.replace("Person", { personId: person.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save this person.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackButton label="Close" />
      <Text variant="screenTitle" style={styles.title}>
        Add a person
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        A name is the only thing needed. Everything else can wait.
      </Text>

      <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          Relationship
        </Text>
        <View style={styles.chipRow}>
          {RELATIONSHIP_TYPE_OPTIONS.map((r) => (
            <Chip key={r.value} label={r.label} active={relationship === r.value} onPress={() => setRelationship(r.value)} />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text variant="meta" style={styles.label}>
          Birthday
        </Text>
        <View style={styles.birthdayRow}>
          <Field label="Day" hideLabel value={day} onChangeText={setDay} placeholder="Day" keyboardType="number-pad" style={styles.dayInput} />
          <View style={styles.monthField}>
            <View style={styles.chipRow}>
              {MONTHS.map((m, i) => (
                <Chip key={m} label={m.slice(0, 3)} active={month === i} onPress={() => setMonth(i)} />
              ))}
            </View>
          </View>
        </View>
        {!yearUnknown ? (
          <Field label="Year" hideLabel value={year} onChangeText={setYear} placeholder="Year" keyboardType="number-pad" style={styles.yearInput} />
        ) : null}
        <Button
          label={yearUnknown ? "Year unknown — no age will be shown" : "I don't know the year"}
          variant={yearUnknown ? "primary" : "secondary"}
          fullWidth={false}
          onPress={() => setYearUnknown((v) => !v)}
        />
      </View>

      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Button label={busy ? "Saving…" : "Save"} onPress={onSave} disabled={busy || !name.trim()} style={styles.save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 },
  sub: { marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, fontWeight: "500" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  birthdayRow: { marginBottom: spacing.sm },
  dayInput: { marginBottom: spacing.sm },
  monthField: { marginBottom: 0 },
  yearInput: { marginTop: spacing.sm },
  error: { color: color.red, marginBottom: spacing.sm },
  save: { marginTop: spacing.sm },
});
