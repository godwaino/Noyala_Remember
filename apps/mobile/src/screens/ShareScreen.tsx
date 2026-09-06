import React, { useCallback, useState } from "react";
import { View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { Circle, PersonShare } from "@noyala/domain";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { BackButton } from "../components/primitives";
import { SwitchRow } from "../components/Switch";
import { LoadingState } from "../components/Skeleton";
import { useAuth } from "../lib/auth";
import { listMyShareableCircles, listSharesForPerson, sharePersonWithCircle, updateShareFlags, revokeShare } from "../data/circles";
import { spacing } from "../theme";
import type { RootStackScreenProps } from "../navigation/types";

export function ShareScreen({ route }: RootStackScreenProps<"Share">) {
  const { personId } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [shares, setShares] = useState<PersonShare[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [c, s] = await Promise.all([listMyShareableCircles(user.id), listSharesForPerson(personId)]);
    setCircles(c);
    setShares(s);
    setLoading(false);
  }, [user, personId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <LoadingState label="Loading sharing…" />;

  return (
    <Screen>
      <BackButton />
      <Text variant="screenTitle" style={styles.title}>
        Sharing
      </Text>
      <Text variant="bodyMuted" style={styles.sub}>
        Dates and ordinary notes only. Private notes are never shared, and you can revoke at any moment.
      </Text>

      {circles.length === 0 ? (
        <Text variant="bodyMuted">Create a circle first to share this person into it.</Text>
      ) : (
        circles.map((circle) => {
          const share = shares.find((s) => s.circleId === circle.id);
          return (
            <View key={circle.id} style={styles.circleBlock}>
              <Text variant="label" style={styles.circleName}>
                {circle.name}
              </Text>
              {share ? (
                <>
                  <SwitchRow
                    label="Share memories"
                    sub="Only notes marked ordinary — private ones never share, no matter this setting."
                    value={share.shareMemories}
                    onValueChange={async (v) => {
                      await updateShareFlags(share.id, { shareMemories: v, shareGiftPlanning: share.shareGiftPlanning });
                      load();
                    }}
                  />
                  <SwitchRow
                    label="Share gift planning"
                    value={share.shareGiftPlanning}
                    onValueChange={async (v) => {
                      await updateShareFlags(share.id, { shareMemories: share.shareMemories, shareGiftPlanning: v });
                      load();
                    }}
                    last
                  />
                  <Button
                    label="Revoke"
                    variant="text"
                    fullWidth={false}
                    onPress={async () => {
                      await revokeShare(share.id);
                      load();
                    }}
                    style={styles.revoke}
                  />
                </>
              ) : (
                <Button
                  label={`Share with ${circle.name}`}
                  variant="secondary"
                  onPress={async () => {
                    if (!user) return;
                    await sharePersonWithCircle(user.id, {
                      personId,
                      circleId: circle.id,
                      shareMemories: false,
                      shareGiftPlanning: true,
                    });
                    load();
                  }}
                />
              )}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  sub: { marginBottom: spacing.lg },
  circleBlock: { marginBottom: spacing.lg },
  circleName: { marginBottom: spacing.sm },
  revoke: { marginTop: spacing.sm },
});
