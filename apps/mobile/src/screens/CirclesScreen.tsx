import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Circle, CircleInvitation } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { Card } from "../components/Card";
import { BackButton } from "../components/primitives";
import { LoadingState } from "../components/Skeleton";
import { useAuth } from "../lib/auth";
import { listMyCircles, listMyPendingInvitations, acceptInvitation, declineInvitation, createCircle } from "../data/circles";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function CirclesScreen({ navigation }: RootStackScreenProps<"Circles">) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [invitations, setInvitations] = useState<CircleInvitation[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    const [c, i] = await Promise.all([listMyCircles(), listMyPendingInvitations(user.email)]);
    setCircles(c);
    setInvitations(i);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingState label="Loading circles…" />;

  return (
    <Screen>
      <BackButton label="More" />
      <Text variant="screenTitle" style={styles.title}>
        Circles
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        A circle sees only the people you share into it, and only the notes you marked ordinary.
      </Text>

      {invitations.length > 0 ? (
        <View style={styles.section}>
          {invitations.map((inv) => (
            <Card key={inv.id} style={styles.inviteCard}>
              <Text variant="body" style={styles.inviteText}>
                You've been invited as {inv.role}.
              </Text>
              <View style={styles.inviteActions}>
                <Button
                  label="Accept"
                  fullWidth={false}
                  onPress={async () => {
                    await acceptInvitation(inv.token);
                    load();
                  }}
                />
                <Button
                  label="Decline"
                  variant="text"
                  fullWidth={false}
                  onPress={async () => {
                    await declineInvitation(inv.id);
                    load();
                  }}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        {circles.map((c) => (
          <Card key={c.id} onPress={() => navigation.navigate("CircleDetail", { circleId: c.id })} style={styles.circleCard}>
            <Text variant="nameLg">{c.name}</Text>
          </Card>
        ))}
      </View>

      {creating ? (
        <View>
          <Field label="Circle name" value={name} onChangeText={setName} placeholder="The Osei family" />
          <Button
            label="Create"
            onPress={async () => {
              if (!user || !name.trim()) return;
              const circle = await createCircle(user.id, { name: name.trim() });
              setCreating(false);
              setName("");
              navigation.navigate("CircleDetail", { circleId: circle.id });
            }}
          />
        </View>
      ) : (
        <Button label="Create a circle" variant="secondary" onPress={() => setCreating(true)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  inviteCard: { marginBottom: spacing.sm },
  inviteText: { marginBottom: spacing.sm },
  inviteActions: { flexDirection: "row", gap: 6 },
  circleCard: { marginBottom: spacing.sm },
});
