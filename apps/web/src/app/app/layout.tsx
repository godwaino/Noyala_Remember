import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";

/** The signed-in product app (Home/People/Calendar/Drafts/Gifts/Circles/Settings)
 * — moved here from the root layout during the 2026-09-07 web redesign so
 * `/` could become the public marketing site instead. Each page under here
 * still does its own `redirect("/login")` when signed out (unchanged). */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
