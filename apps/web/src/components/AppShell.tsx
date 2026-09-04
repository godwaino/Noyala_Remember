import type { ReactNode } from "react";
import { PrimaryNav } from "./PrimaryNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background text-ink flex min-h-dvh flex-col sm:flex-row">
      <a
        href="#main-content"
        className="bg-primary focus:text-surface sr-only px-4 py-2 focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-md"
      >
        Skip to content
      </a>
      <PrimaryNav />
      <main id="main-content" className="flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
