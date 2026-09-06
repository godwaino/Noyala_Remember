import React from "react";
import { ScrollView, View, StyleSheet, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, spacing } from "../theme";

interface Props extends ScrollViewProps {
  children: React.ReactNode;
  padded?: boolean;
}

/** Every screen's outer shell: ivory background, safe-area aware, a
 * consistent horizontal gutter. The design's canvas mock uses a fixed
 * `padding:62px 20px 0` to clear its simulated status bar; a real device
 * already reserves that space via the safe area, so this only adds the
 * design's horizontal gutter plus a little breathing room under the
 * notch. */
export function Screen({ children, padded = true, contentContainerStyle, ...rest }: Props) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[padded && styles.padded, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        {...rest}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Non-scrolling variant for loading/empty states that should stay put. */
export function StaticScreen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={[styles.padded, styles.flex]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  padded: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
});
