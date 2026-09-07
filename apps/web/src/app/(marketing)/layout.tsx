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
    <div className={`${marketingSans.variable} ${marketingSerif.variable} font-marketing-sans bg-marketing-ivory text-marketing-ink min-h-dvh`}>
      <MarketingHeader />
      {children}
      <MarketingFooter />
    </div>
  );
}
