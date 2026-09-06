import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Avatar } from "./primitives";
import { color, spacing, MIN_TAP } from "../theme";

interface Props {
  title: string;
  meta?: string;
  trailing?: string;
  initials?: string;
  onPress?: () => void;
  last?: boolean;
}

/** The recurring "row with an avatar, a title/meta pair, and a trailing
 * value" pattern — Home's Coming up, People's list, Calendar's agenda. */
export function ListRow({ title, meta, trailing, initials, onPress, last = false }: Props) {
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={[styles.row, !last && styles.divider]}
    >
      {initials ? <Avatar initials={initials} /> : null}
      <View style={styles.body}>
        <Text variant="label" numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text variant="meta" numberOfLines={1} style={styles.meta}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ? <Text variant="meta">{trailing}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.smd,
    minHeight: MIN_TAP,
    paddingVertical: 14,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  body: { flex: 1, minWidth: 0 },
  meta: { marginTop: 3 },
});
