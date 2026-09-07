import type { Config } from "tailwindcss";
import { tokens, webTokens } from "@noyala/brand";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: tokens.color.background,
        surface: tokens.color.surface,
        ink: tokens.color.ink,
        "ink-muted": tokens.color.inkMuted,
        primary: tokens.color.primary,
        "primary-muted": tokens.color.primaryMuted,
        accent: tokens.color.accent,
        border: tokens.color.border,
        danger: tokens.color.danger,
        success: tokens.color.success,
        // Marketing/account site palette (apps/web/src/app/(marketing)) —
        // a separate namespace from the tokens above, which the signed-in
        // /app/* product still uses. See @noyala/brand's `webTokens`.
        "marketing-ivory": webTokens.color.ivory,
        "marketing-paper": webTokens.color.paper,
        "marketing-wash": webTokens.color.wash,
        "marketing-ink": webTokens.color.ink,
        "marketing-body": webTokens.color.body,
        "marketing-grey": webTokens.color.grey,
        "marketing-border": webTokens.color.border,
        "marketing-hairline": webTokens.color.hairline,
        "marketing-clay": webTokens.color.clay,
        "marketing-clay-text": webTokens.color.clayText,
        "marketing-action": webTokens.color.action,
        "marketing-action-hover": webTokens.color.actionHover,
        "marketing-clay-wash": webTokens.color.clayWash,
        "marketing-sage": webTokens.color.sage,
        "marketing-sage-deep": webTokens.color.sageDeep,
        "marketing-sage-border": webTokens.color.sageBorder,
        "marketing-sage-wash": webTokens.color.sageWash,
        "marketing-red": webTokens.color.red,
        "marketing-red-border": webTokens.color.redBorder,
        "marketing-red-wash": webTokens.color.redWash,
        "marketing-destructive-border": webTokens.color.destructiveBorder,
        "marketing-disabled": webTokens.color.disabled,
        "marketing-placeholder-border": webTokens.color.placeholderBorder,
      },
      spacing: {
        // Half-steps the marketing design specifies (18px/22px/26px/30px)
        // that Tailwind's default scale stops short of — without these the
        // `p-4.5`/`mb-5.5`/`mb-6.5`/`px-7.5` classes used across
        // apps/web/src/app/(marketing) compile to nothing at all.
        "4.5": "1.125rem",
        "5.5": "1.375rem",
        "6.5": "1.625rem",
        "7.5": "1.875rem",
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        pill: tokens.radius.pill,
      },
      fontFamily: {
        sans: [tokens.font.sans],
        // Marketing-only, real webfonts (loaded via next/font in
        // apps/web/src/app/(marketing)/layout.tsx and exposed as CSS
        // variables scoped to that layout) — the shared `sans` key above
        // stays untouched so the existing /app/* product is unaffected.
        "marketing-sans": ["var(--font-marketing-sans)", tokens.font.sans],
        "marketing-serif": ["var(--font-marketing-serif)", "serif"],
      },
      screens: {
        // The marketing nav's own collapse breakpoint, per the design spec
        // (distinct from Tailwind's default 1024px `lg`).
        navwide: "1000px",
      },
    },
  },
  plugins: [],
};

export default config;
