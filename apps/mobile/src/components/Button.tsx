import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "./Text";
import { color, radius, MIN_TAP } from "../theme";

type Variant = "primary" | "secondary" | "text" | "danger";

interface Props {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

/** The three button languages the design specifies: a solid rounded
 * rectangle for primary actions, an outlined one for secondary actions,
 * and a plain text button for low-priority ones — never a pill as the
 * default action shape. */
export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
  fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "text" && styles.text,
        variant === "danger" && styles.danger,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : color.clay} />
      ) : (
        <Text
          variant={variant === "primary" ? "buttonLabel" : "buttonLabelSecondary"}
          style={variant === "text" ? styles.textLabel : variant === "danger" ? styles.dangerLabel : undefined}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: MIN_TAP,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  fullWidth: { width: "100%" },
  primary: { backgroundColor: color.action },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
  },
  text: { backgroundColor: "transparent" },
  danger: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#EFD6D3",
    borderRadius: radius.control,
  },
  textLabel: { color: color.action },
  dangerLabel: { color: color.red },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
});
