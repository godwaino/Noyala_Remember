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
    primary: "#B5654A",
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

export const primaryNav = [
  { key: "home", label: "Home", href: "/" },
  { key: "people", label: "People", href: "/people" },
  { key: "calendar", label: "Calendar", href: "/calendar" },
  { key: "drafts", label: "Drafts", href: "/drafts" },
  { key: "gifts", label: "Gifts", href: "/gifts" },
  { key: "circles", label: "Circles", href: "/circles" },
  { key: "settings", label: "Settings", href: "/settings" },
] as const;
