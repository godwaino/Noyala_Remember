import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "./Text";
import { Button } from "./Button";
import { color, radius, spacing } from "../theme";

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/** A bottom sheet — the design's own device-agnostic modal shape, used for
 * the handoff choices. "Opening an app is not a send" lives here as the
 * description, right next to the choices themselves. */
export function Sheet({ visible, onClose, title, description, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <SafeAreaView style={styles.sheetWrap} edges={["bottom"]}>
        <View style={styles.handle} />
        <Text variant="cardTitle" style={styles.title}>
          {title}
        </Text>
        {description ? (
          <Text variant="meta" style={styles.description}>
            {description}
          </Text>
        ) : null}
        {children}
        <Button label="Not now" variant="text" onPress={onClose} style={styles.notNow} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(37,34,41,0.34)" },
  sheetWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.background,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: color.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: { marginBottom: 6 },
  description: { marginBottom: spacing.md },
  notNow: { marginTop: spacing.xs },
});
