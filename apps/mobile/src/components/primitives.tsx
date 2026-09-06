import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Text } from "./Text";
import { Button } from "./Button";
import { color, radius, spacing, MIN_TAP } from "../theme";

export function SectionLabel({ children, clay = false }: { children: React.ReactNode; clay?: boolean }) {
  return (
    <Text variant={clay ? "eyebrowClay" : "eyebrow"} style={styles.sectionLabel}>
      {children}
    </Text>
  );
}

export function Divider({ spacing: gap = spacing.md }: { spacing?: number }) {
  return <View style={[styles.divider, { marginVertical: gap }]} />;
}

/** The "← Back" / "← Close" / "← More" pattern used at the top of almost
 * every pushed screen. */
export function BackButton({ label = "Back", onPress }: { label?: string; onPress?: () => void }) {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={onPress ?? (() => navigation.goBack())}
      style={styles.backButton}
    >
      <Text variant="linkLabel">← {label}</Text>
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

/** Filters, compact statuses and removable context selections — the only
 * three places the design allows a pill shape. */
export function Chip({ label, active = false, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text variant="buttonLabelSecondary" style={active ? styles.chipLabelActive : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "sage" | "amber" | "red" }) {
  const toneColor = tone === "sage" ? color.sage : tone === "amber" ? color.amber : tone === "red" ? color.red : color.inkMuted;
  return (
    <View style={[styles.statusChip, { borderColor: toneColor + "55" }]}>
      <Text variant="buttonLabelSecondary" style={{ color: toneColor, fontSize: 12.5 }}>
        {label}
      </Text>
    </View>
  );
}

export function Avatar({ initials, size = 38 }: { initials: string; size?: number }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text variant="nameLg" style={{ fontSize: size * 0.4, color: color.clay, lineHeight: size * 0.45 }}>
        {initials}
      </Text>
    </View>
  );
}

/** The Memory Thread: a knot (dot) marking a moment, with a hairline
 * continuing down to the next one — chronology on a profile timeline,
 * provenance in Home's hero, progression through the studio. */
export function ThreadDot({ filled = true, size = 9 }: { filled?: boolean; size?: number }) {
  return (
    <View
      style={
        filled
          ? { width: size, height: size, borderRadius: size / 2, backgroundColor: color.clay }
          : {
              width: size - 2,
              height: size - 2,
              borderRadius: size / 2,
              borderWidth: 1.5,
              borderColor: color.clay,
            }
      }
    />
  );
}

export function ThreadLine() {
  return <View style={styles.threadLine} />;
}

/** A dot + continuing line, wrapping whatever content sits beside it —
 * the layout every timeline/hero/history row in the design shares. */
export function ThreadRow({
  children,
  last = false,
  filled = true,
}: {
  children: React.ReactNode;
  last?: boolean;
  filled?: boolean;
}) {
  return (
    <View style={styles.threadRow}>
      <View style={styles.threadRail}>
        <ThreadDot filled={filled} />
        {!last && <ThreadLine />}
      </View>
      <View style={styles.threadContent}>{children}</View>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  body: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <View>
      <Text variant="cardTitle" style={styles.emptyTitle}>
        {title}
      </Text>
      <Text variant="bodyMuted" style={styles.emptyBody}>
        {body}
      </Text>
      {primaryLabel ? <Button label={primaryLabel} onPress={onPrimary} style={styles.emptyPrimary} /> : null}
      {secondaryLabel ? <Button label={secondaryLabel} variant="secondary" onPress={onSecondary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: { marginBottom: spacing.sm },
  divider: { height: 1, backgroundColor: color.hairline },
  backButton: { minHeight: MIN_TAP, justifyContent: "center", marginBottom: spacing.md },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: color.ink, borderColor: color.ink },
  chipLabelActive: { color: "#fff" },
  statusChip: {
    borderWidth: 1,
    borderRadius: radius.tag,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  avatar: { backgroundColor: color.wash, alignItems: "center", justifyContent: "center" },
  threadLine: { flex: 1, width: 1, backgroundColor: color.border, marginTop: 2 },
  threadRow: { flexDirection: "row", gap: spacing.smd },
  threadRail: { width: 11, alignItems: "center", paddingTop: 7 },
  threadContent: { flex: 1, paddingBottom: spacing.lg },
  emptyTitle: { marginBottom: 10 },
  emptyBody: { marginBottom: spacing.lg },
  emptyPrimary: { marginBottom: spacing.sm },
});
