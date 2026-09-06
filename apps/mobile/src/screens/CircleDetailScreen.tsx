import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Circle, CircleMember } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { BackButton, SectionLabel, StatusChip } from "../components/primitives";
import { LoadingState } from "../components/Skeleton";
import { useAuth } from "../lib/auth";
import { getCircle, listCircleMembers, getMyMembership, inviteToCircle, removeMember, leaveCircle } from "../data/circles";
import { spacing, color } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function CircleDetailScreen({ route, navigation }: RootStackScreenProps<"CircleDetail">) {
  const { circleId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [circle, setCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [myRole, setMyRole] = useState<CircleMember["role"] | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, m, mine] = await Promise.all([getCircle(circleId), listCircleMembers(circleId), getMyMembership(circleId, user.id)]);
    setCircle(c);
    setMembers(m);
    setMyRole(mine?.role ?? null);
    setLoading(false);
  }, [circleId, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading || !circle) return <LoadingState label="Loading circle…" />;

  const canManage = myRole === "owner" || myRole === "organiser";

  return (
    <Screen>
      <BackButton label="Circles" />
      <Text variant="screenTitle" style={styles.title}>
        {circle.name}
      </Text>

      <SectionLabel>Members</SectionLabel>
      <View style={styles.section}>
        {members.map((m) => (
          <View key={m.id} style={styles.memberRow}>
            <Text variant="label" style={styles.flex1}>
              {m.userId === user?.id ? "You" : m.userId}
            </Text>
            <StatusChip label={m.role} />
            {myRole === "owner" && m.role !== "owner" ? (
              <Button
                label="Remove"
                variant="text"
                fullWidth={false}
                onPress={async () => {
                  await removeMember(m.id);
                  load();
                }}
              />
            ) : null}
          </View>
        ))}
      </View>

      {canManage ? (
        inviting ? (
          <View style={styles.section}>
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            {error ? (
              <Text variant="meta" style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <Button
              label="Send invitation"
              onPress={async () => {
                if (!user) return;
                try {
                  await inviteToCircle(circleId, user.id, { invitedEmail: email.trim(), role: "viewer" });
                  setInviting(false);
                  setEmail("");
                  setError(null);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't send that invitation.");
                }
              }}
            />
          </View>
        ) : (
          <Button label="Invite someone" variant="secondary" onPress={() => setInviting(true)} style={styles.gap} />
        )
      ) : null}

      {myRole && myRole !== "owner" ? (
        <Button
          label="Leave this circle"
          variant="text"
          onPress={async () => {
            if (!user) return;
            await leaveCircle(circleId, user.id);
            navigation.goBack();
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  memberRow: { flexDirection: "row", alignItems: "center", gap: spacing.smd, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: color.hairline },
  flex1: { flex: 1, minWidth: 0 },
  gap: { marginBottom: spacing.sm },
  error: { color: color.red, marginBottom: spacing.sm },
});
