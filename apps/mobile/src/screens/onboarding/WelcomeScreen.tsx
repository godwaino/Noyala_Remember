import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { StaticScreen } from "../../components/Screen";
import { Text } from "../../components/Text";
import { Button } from "../../components/Button";
import { color, spacing } from "../../theme";
import type { AuthStackScreenProps } from "../../navigation/types";

function Mark({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <Path d="M7 25V11.5c0-3 2.2-5 5-5s5 2 5 5V21c0 3 2.2 5 5 5s5-2 5-5V7.5" stroke={color.clay} strokeWidth={2.4} strokeLinecap="round" />
      <Circle cx={7} cy={7.2} r={2.3} fill={color.clay} />
    </Svg>
  );
}

/** The Noyala Memory Thread as a brand mark — a continuous line with a
 * knot, standing in for a needless heart/robot/gift-box glyph. */
export { Mark };

export function WelcomeScreen({ navigation }: AuthStackScreenProps<"Welcome">) {
  return (
    <StaticScreen>
      <View style={styles.center}>
        <Mark />
        <Text variant="screenTitle" style={styles.wordmark}>
          Noyala
        </Text>
        <Text variant="messageBody" style={styles.tagline}>
          Remember the person, not just the date.
        </Text>
        <Text variant="bodyMuted">
          A private journal of the people you care about. It keeps what you tell it, helps you write
          something worth reading, and never sends anything on its own.
        </Text>
      </View>
      <Button label="Get started" onPress={() => navigation.navigate("SignIn")} style={styles.gap} />
      <Button label="I already have an account" variant="text" onPress={() => navigation.navigate("SignIn")} />
    </StaticScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  wordmark: { marginTop: spacing.md, marginBottom: 12 },
  tagline: { marginBottom: 18 },
  gap: { marginBottom: spacing.sm },
});
