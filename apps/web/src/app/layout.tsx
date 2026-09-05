import type { Metadata, Viewport } from "next";
import { brand, metadata as brandMetadata, tokens } from "@noyala/brand";
import { AppShell } from "@/components/AppShell";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ServiceWorkerRegistration />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
