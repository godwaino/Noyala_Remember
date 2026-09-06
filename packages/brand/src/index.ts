/**
 * Single source of truth for Noyala's product identity. Apps must import
 * from here instead of hardcoding name/tagline/color strings.
 */

export const brand = {
  name: "Noyala",
  tagline: "Remember the person, not just the date.",
  positioning:
    "A personal relationship assistant that helps people remember what matters and act thoughtfully at the right time.",
} as const;

export const metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.positioning,
} as const;

/** Sender identity for transactional email/push — never a personal message channel. */
export const notificationSender = {
  displayName: brand.name,
  reminderSubjectPrefix: `${brand.name} reminder`,
} as const;

/**
 * Design tokens. Kept as plain values (not Tailwind classes) so both the
 * web app's Tailwind theme and, later, the Expo app's stylesheet can
 * consume the same numbers.
 */
export const tokens = {
  color: {
    background: "#FBF8F4",
    surface: "#FFFFFF",
    ink: "#231F20",
    inkMuted: "#6B6560",
    // Stage 9 accessibility audit (live axe-core scans of /login and /)
    // found two failures against the original #B5654A: white text on a
    // `bg-primary` button (4.26:1) and `text-primary` on the active nav
    // link's `bg-primary-muted/40` tint (4.27:1 once blended) — both
    // under WCAG 2 AA's 4.5:1 minimum for normal-size text. Darkened to
    // the same hue/saturation at 85% lightness (5.56:1 vs white, 4.68:1
    // vs the muted tint) rather than picking an unrelated shade, so both
    // pairings clear the threshold while it still reads as the same
    // brand color.
    primary: "#9A563F",
    primaryMuted: "#E7C8BB",
    accent: "#4C6B5C",
    border: "#E7E1D8",
    danger: "#B3413B",
    success: "#3E6B52",
  },
  radius: {
    sm: "6px",
    md: "12px",
    lg: "20px",
    pill: "999px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "40px",
  },
  font: {
    sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
} as const;

export type Brand = typeof brand;
export type Tokens = typeof tokens;

/**
 * Mobile design tokens — the resolved system from the 2026-09-06 Claude
 * Design refinement pass ("Noyala Mobile v2"), scoped to `apps/mobile`.
 * Additive to `tokens` above rather than replacing it: `tokens` already
 * ties `apps/web`'s Tailwind theme to Stage 9's a11y-audited contrast
 * pairs (see the comment on `tokens.color.primary`), so this sits
 * alongside it instead of changing values a live surface depends on.
 * A richer palette and a second (serif) typeface were part of what that
 * design pass resolved — see docs/decisions if this diverges from
 * `tokens` again in a later pass.
 */
export const mobileTokens = {
  color: {
    background: "#FBF8F4", // Warm Ivory
    surface: "#FFFDFC", // Soft White
    ink: "#252229", // Deep Ink
    inkMuted: "#706970", // Warm Grey
    clay: "#A95A3F", // Noyala Clay — accents, active nav, occasion emphasis
    action: "#984A36", // Action Clay — solid primary buttons w/ white text
    deepClay: "#7E3D2F", // pressed states, strong clay-coloured text
    border: "#E3DCD6", // Neutral Border
    hairline: "#EDE7E1", // list-row dividers, thinner than border
    disabledSurface: "#E8E3DE",
    peach: "#E7C8B8", // Muted Peach — occasional warm highlights only
    wash: "#F3EDE7", // avatar/icon chip backgrounds
    tint: "#FBF2ED", // icon-circle tint (voice capture, etc.)
    sage: "#4C6B5C", // Forest Sage — saved/completed/reassuring states
    amber: "#A96F25", // Warm Amber — genuine attention states
    red: "#B34138", // Muted Red — errors, privacy warnings, destructive
  },
  radius: {
    tag: "6px",
    control: "10px",
    button: "12px",
    card: "14px",
    sheet: "16px",
    pill: "999px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    smd: "12px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "40px",
  },
  font: {
    sans: "Inter",
    serif: "Newsreader",
  },
  minTapTarget: {
    ios: 44,
    android: 48,
  },
} as const;

export type MobileTokens = typeof mobileTokens;

export const primaryNav = [
  { key: "home", label: "Home", href: "/" },
  { key: "people", label: "People", href: "/people" },
  { key: "calendar", label: "Calendar", href: "/calendar" },
  { key: "drafts", label: "Drafts", href: "/drafts" },
  { key: "gifts", label: "Gifts", href: "/gifts" },
  { key: "circles", label: "Circles", href: "/circles" },
  { key: "settings", label: "Settings", href: "/settings" },
] as const;
