import type { TextStyle } from "react-native";
import { color, fontFamily } from "./tokens";

/**
 * Text styles pulled directly from the resolved Noyala Mobile v2 design:
 * Newsreader for names/occasions/message bodies, Inter for everything
 * else. Sizes match the design's `font:` shorthand values.
 */
export const typography = {
  brandWordmark: {
    fontFamily: fontFamily.serifMedium,
    fontSize: 25,
    lineHeight: 25,
    color: color.ink,
  } satisfies TextStyle,
  screenTitle: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 28,
    lineHeight: 32,
    color: color.ink,
  } satisfies TextStyle,
  heroTitle: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 30,
    lineHeight: 35,
    color: color.ink,
  } satisfies TextStyle,
  sectionTitle: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 26,
    lineHeight: 30,
    color: color.ink,
  } satisfies TextStyle,
  cardTitle: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 22,
    lineHeight: 28,
    color: color.ink,
  } satisfies TextStyle,
  nameLg: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 19,
    lineHeight: 25,
    color: color.ink,
  } satisfies TextStyle,
  messageBody: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 17,
    lineHeight: 26,
    color: color.ink,
  } satisfies TextStyle,
  memoryBody: {
    fontFamily: fontFamily.serifRegular,
    fontSize: 16,
    lineHeight: 25,
    color: color.ink,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12.5,
    lineHeight: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: color.inkMuted,
  } satisfies TextStyle,
  eyebrowClay: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12.5,
    lineHeight: 15,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: color.clay,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 15,
    lineHeight: 24,
    color: color.ink,
  } satisfies TextStyle,
  bodyMuted: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 15,
    lineHeight: 24,
    color: color.inkMuted,
  } satisfies TextStyle,
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15.5,
    lineHeight: 20,
    color: color.ink,
  } satisfies TextStyle,
  meta: {
    fontFamily: fontFamily.sansRegular,
    fontSize: 13.5,
    lineHeight: 18,
    color: color.inkMuted,
  } satisfies TextStyle,
  metaStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12.5,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: color.inkMuted,
  } satisfies TextStyle,
  buttonLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: "#fff",
  } satisfies TextStyle,
  buttonLabelSecondary: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    color: color.ink,
  } satisfies TextStyle,
  linkLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    color: color.action,
  } satisfies TextStyle,
} as const;

export type TypographyVariant = keyof typeof typography;
