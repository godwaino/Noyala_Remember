import type { Config } from "tailwindcss";
import { tokens } from "@noyala/brand";

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
      },
      borderRadius: {
        sm: tokens.radius.sm,
        md: tokens.radius.md,
        lg: tokens.radius.lg,
        pill: tokens.radius.pill,
      },
      fontFamily: {
        sans: [tokens.font.sans],
      },
    },
  },
  plugins: [],
};

export default config;
