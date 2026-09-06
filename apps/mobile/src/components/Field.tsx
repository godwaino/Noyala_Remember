import React from "react";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { Text } from "./Text";
import { color, fontFamily, radius, spacing, MIN_TAP } from "../theme";

interface Props extends TextInputProps {
  label?: string;
  hideLabel?: boolean;
  error?: string | null;
  serif?: boolean;
}

export function Field({ label, hideLabel = false, error, serif = false, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="meta" style={[styles.label, hideLabel && styles.srOnly]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={color.inkMuted}
        style={[styles.input, serif && styles.serifInput, style]}
        accessibilityLabel={hideLabel ? label : undefined}
        {...rest}
      />
      {error ? (
        <Text variant="meta" style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { marginBottom: spacing.sm, fontWeight: "500" },
  srOnly: { position: "absolute", width: 1, height: 1, overflow: "hidden" },
  input: {
    minHeight: MIN_TAP,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    paddingHorizontal: 14,
    fontFamily: fontFamily.sansRegular,
    fontSize: 16,
    color: color.ink,
  },
  serifInput: { fontFamily: fontFamily.serifRegular, fontSize: 16.5 },
  error: { color: color.red, marginTop: spacing.xs },
});
