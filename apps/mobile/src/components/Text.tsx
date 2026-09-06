import React from "react";
import { Text as RNText, type TextProps } from "react-native";
import { typography, type TypographyVariant } from "../theme";

interface Props extends TextProps {
  variant?: TypographyVariant;
}

/** Every piece of text in this app should go through this, so a variant
 * change (say, tweaking `body`'s line height) doesn't need touching every
 * screen — mirrors the design's `font:` shorthand system as named presets
 * instead of ad-hoc inline styles per screen. */
export function Text({ variant = "body", style, ...rest }: Props) {
  return <RNText style={[typography[variant], style]} {...rest} />;
}
