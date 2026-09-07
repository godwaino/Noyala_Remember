import type { Metadata, Viewport } from "next";
import { brand, metadata as brandMetadata, tokens } from "@noyala/brand";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: brandMetadata.title,
    template: `%s — ${brand.name}`,
  },
  description: brandMetadata.description,
  manifest: "/manifest.webmanifest",
  applicationName: brand.name,
};

export const viewport: Viewport = {
  themeColor: tokens.color.background,
  width: "device-width",
  initialScale: 1,
};

/**
 * Deliberately minimal — no shared nav/shell here. `/app/*` (the signed-in
 * product) and the marketing/account site each mount their own shell in a
 * nested layout, since the 2026-09-07 redesign gave them different chrome
 * entirely (a sidebar app nav vs. a marketing header+footer). See
 * apps/web/src/app/app/layout.tsx and
 * apps/web/src/app/(marketing)/layout.tsx.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
