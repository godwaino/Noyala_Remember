/**
 * The Noyala brand mark: a monoline glyph with a ball terminal, drawn as a
 * single open stroke.
 *
 * Deliberately inline SVG rather than a raster asset — it stays crisp at
 * every size (18px in the footer, 512px in the web manifest), weighs a few
 * hundred bytes, and takes its colour from `currentColor` so the same
 * component works on ivory, on the sage CTA band and in a dark browser tab.
 *
 * `apps/web/src/app/icon.svg` carries the same geometry for the favicon.
 * If the mark changes, both must change together.
 */
export function NoyalaMark({
  size = 30,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size * (56 / 66)}
      viewBox="0 0 66 56"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Ball terminal, detached like a tittle. */}
      <circle cx="11" cy="11" r="4.8" fill="currentColor" />
      {/* One continuous stroke: stem, bowl, shoulder, descender. */}
      <path
        d="M11 23v9c0 9 19 9 19 0V23c0-9 19-9 19 0v21"
        stroke="currentColor"
        strokeWidth="7.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Mark plus wordmark, as used in the header and footer. The wordmark stays
 * live text in the brand serif rather than being baked into the SVG, so it
 * inherits the page's font loading and stays selectable and searchable.
 */
export function NoyalaLogo({
  markSize = 30,
  className = "",
  wordmarkClassName = "",
}: {
  markSize?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <NoyalaMark size={markSize} className="text-marketing-clay flex-none" />
      <span className={`font-marketing-serif leading-none ${wordmarkClassName}`}>Noyala</span>
    </span>
  );
}
