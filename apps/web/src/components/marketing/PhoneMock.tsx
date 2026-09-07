/** The dark rounded phone bezel the design wraps every product screenshot
 * slot in. `Real product screenshot at 3x density` per the handoff README
 * — this renders the design's own placeholder content until one exists. */
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
    <div className="flex justify-center" style={{ flex: `0 1 ${width}px` }}>
      <div
        className={`w-full rounded-[40px] bg-marketing-ink p-2 ${shadow ? "shadow-[0_30px_60px_-30px_rgba(37,34,41,0.4)]" : ""}`}
        style={{ maxWidth: width }}
      >
        <div
          className="overflow-hidden rounded-[33px] bg-marketing-ivory px-[17px] pt-6"
          style={{ height }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
