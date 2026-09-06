import React from "react";
import { View, StyleSheet } from "react-native";
import { StaticScreen } from "./Screen";
import { Text } from "./Text";
import { color, spacing } from "../theme";

export function Skeleton({ width, height }: { width: number | `${number}%`; height: number }) {
  return <View style={[styles.block, { width, height }]} />;
}

export function LoadingState({ label }: { label: string }) {
  return (
    <StaticScreen>
      <View style={styles.gap}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="90%" height={60} />
        <Skeleton width="40%" height={14} />
        <Skeleton width="80%" height={60} />
      </View>
      <Text variant="meta" style={styles.label} accessibilityRole="text">
        {label}
      </Text>
    </StaticScreen>
  );
}

const styles = StyleSheet.create({
  block: { borderRadius: 6, backgroundColor: "#EDE7E1" },
  gap: { gap: spacing.smd },
  label: { marginTop: spacing.md },
});
