import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { color, radius, spacing, MIN_TAP } from "../theme";

interface SwitchProps {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}

export function Switch({ value, onValueChange, accessibilityLabel }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[styles.track, value && styles.trackOn]}
    >
      <View style={[styles.knob, value && styles.knobOn]} />
    </Pressable>
  );
}

/** Label + description on the left, a switch on the right — reminders,
 * sharing flags, surprise mode. */
export function SwitchRow({
  label,
  sub,
  value,
  onValueChange,
  last = false,
}: {
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={styles.body}>
        <Text variant="label">{label}</Text>
        {sub ? (
          <Text variant="meta" style={styles.sub}>
            {sub}
          </Text>
        ) : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 46,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    padding: 3,
    justifyContent: "center",
  },
  trackOn: { backgroundColor: color.sage },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { transform: [{ translateX: 18 }] },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    minHeight: MIN_TAP,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  body: { flex: 1, minWidth: 0 },
  sub: { marginTop: 3 },
});
