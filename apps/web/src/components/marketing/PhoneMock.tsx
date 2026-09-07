import type { CSSProperties } from "react";

/** The dark rounded phone bezel the design wraps every product screenshot
 * slot in. `Real product screenshot at 3x density` per the handoff README
 * — this renders the design's own placeholder content until one exists.
 *
 * The frame is width-driven (`w-full` up to `width`) so it shrinks to fit
 * narrow viewports instead of forcing a horizontal scroll. `height` is the
 * design's fixed screen height, but it only applies from `sm` up: on a
 * phone, five of these — each with 150–200px of deliberately empty screen
 * below its content — added well over 600px of dead scroll, so there the
 * frame hugs its content instead.
 */
export function PhoneMock({
  width = 280,
  height = 520,
  children,
  shadow = false,
}: {
  width?: number;
  height?: number;
  children: React.ReactNode;
  shadow?: boolean;
}) {
  return (
    <div
      className={`bg-marketing-ink w-full rounded-[40px] p-2 ${
        shadow
          ? "shadow-[0_40px_80px_-40px_rgba(37,34,41,0.55)]"
          : "shadow-[0_24px_48px_-32px_rgba(37,34,41,0.4)]"
      }`}
      style={{ maxWidth: width, "--noy-mock-h": `${height}px` } as CSSProperties}
    >
      {/* Speaker slot — a small piece of physical detail that stops the
          bezel reading as a plain rounded rectangle. */}
      <div aria-hidden="true" className="flex justify-center py-1.5">
        <span className="block h-1 w-14 rounded-full bg-white/20" />
      </div>
      <div className="bg-marketing-ivory h-auto overflow-hidden rounded-[33px] px-[17px] pb-6 pt-5 sm:h-[var(--noy-mock-h)] sm:pb-0">
        {children}
      </div>
    </div>
  );
}
