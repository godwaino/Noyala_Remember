import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { Button } from "./Button";
import { color, radius, spacing } from "../theme";

interface Props {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

/** Consequential actions confirm in place, never with a toast that
 * disappears — deletion, revoking a share, deleting a recording. */
export function ConfirmDialog({ visible, title, body, confirmLabel, onConfirm, onCancel, destructive = false }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Close" />
      <View style={styles.center} pointerEvents="box-none">
        <View style={styles.card} accessibilityRole="alert">
          <Text variant="cardTitle" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyMuted" style={styles.body}>
            {body}
          </Text>
          <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} />
          <Button label="Keep it" variant="text" onPress={onCancel} style={styles.cancel} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(37,34,41,0.4)" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: color.surface,
    borderRadius: radius.sheet,
    padding: spacing.lg,
  },
  title: { marginBottom: 10 },
  body: { marginBottom: spacing.lg },
  cancel: { marginTop: spacing.xs },
});
