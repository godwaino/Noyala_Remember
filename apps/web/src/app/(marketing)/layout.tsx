import type { ReactNode } from "react";
import { Inter, Newsreader } from "next/font/google";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const marketingSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-marketing-sans",
  display: "swap",
});

const marketingSerif = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-marketing-serif",
  display: "swap",
});

/** The public marketing/account site — landing, download, pricing,
 * privacy, support, account, deletion, circle invitation, design notes.
 * Its own header/footer, its own (self-hosted via next/font) typography,
 * entirely separate from `/app/*`'s AppShell. See docs/decisions. */
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${marketingSans.variable} ${marketingSerif.variable} noy-marketing font-marketing-sans bg-marketing-ivory text-marketing-ink flex min-h-dvh flex-col`}
    >
      <a
        href="#noy-main"
        className="bg-marketing-action focus:ring-marketing-clay sr-only z-30 rounded-[10px] px-4 py-2.5 text-[14.5px] font-semibold text-white no-underline focus:not-sr-only focus:absolute focus:left-5 focus:top-3"
      >
        Skip to content
      </a>
      <MarketingHeader />
      <div id="noy-main" className="flex-1">
        {children}
      </div>
      <MarketingFooter />
    </div>
  );
}
