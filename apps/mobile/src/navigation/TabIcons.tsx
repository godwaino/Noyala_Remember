import React from "react";
import Svg, { Path, Circle, Rect } from "react-native-svg";

interface IconProps {
  color: string;
  size?: number;
}

/** Paths lifted directly from the Noyala Mobile v2 design's inline SVGs, so
 * the tab bar icon language matches exactly rather than substituting a
 * generic icon-font glyph. */
export function HomeIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 10.6 12 4.2l8 6.4V19a1.8 1.8 0 0 1-1.8 1.8h-3.4v-5.6H9.2v5.6H5.8A1.8 1.8 0 0 1 4 19z" />
    </Svg>
  );
}

export function PeopleIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Circle cx={9.5} cy={8} r={3.3} />
      <Path d="M3.5 20c0-3.2 2.7-5.3 6-5.3s6 2.1 6 5.3" />
      <Path d="M16.5 5.3a3.3 3.3 0 0 1 0 6.4M18 19.6c0-2.5-.9-4.2-2.4-5.2" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3.6} y={5.2} width={16.8} height={15.2} rx={2.6} />
      <Path d="M8 3.2v4M16 3.2v4M3.6 10h16.8" />
    </Svg>
  );
}

export function MoreIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round">
      <Path d="M4.5 7.5h15M4.5 12h15M4.5 16.5h9.5" />
    </Svg>
  );
}
