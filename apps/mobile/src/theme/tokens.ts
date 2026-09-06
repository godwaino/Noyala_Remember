import { mobileTokens } from "@noyala/brand";

/** RN StyleSheet wants numbers, not CSS px strings. */
function px(value: string): number {
  return Number(value.replace("px", ""));
}

export const color = mobileTokens.color;

export const radius = {
  tag: px(mobileTokens.radius.tag),
  control: px(mobileTokens.radius.control),
  button: px(mobileTokens.radius.button),
  card: px(mobileTokens.radius.card),
  sheet: px(mobileTokens.radius.sheet),
  pill: 999,
};

export const spacing = {
  xs: px(mobileTokens.spacing.xs),
  sm: px(mobileTokens.spacing.sm),
  smd: px(mobileTokens.spacing.smd),
  md: px(mobileTokens.spacing.md),
  lg: px(mobileTokens.spacing.lg),
  xl: px(mobileTokens.spacing.xl),
  xxl: px(mobileTokens.spacing.xxl),
};

/** Registered via @expo-google-fonts/* in App.tsx's useFonts call. */
export const fontFamily = {
  sansRegular: "Inter_400Regular",
  sansMedium: "Inter_500Medium",
  sansSemiBold: "Inter_600SemiBold",
  serifRegular: "Newsreader_400Regular",
  serifMedium: "Newsreader_500Medium",
  serifItalic: "Newsreader_400Regular_Italic",
};

export const minTapTarget = mobileTokens.minTapTarget;

/** iOS/Android both get 48 as a safe minimum — see docs/product.md's
 * "44pt on iOS and 48dp on Android" rule; using the larger of the two
 * everywhere keeps one constant instead of branching on Platform.OS for
 * every touchable. */
export const MIN_TAP = 48;
