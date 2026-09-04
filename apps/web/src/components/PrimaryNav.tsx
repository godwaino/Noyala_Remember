"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "@noyala/brand";

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="border-border bg-surface sticky bottom-0 z-10 flex justify-around border-t sm:static sm:w-56 sm:flex-col sm:justify-start sm:gap-1 sm:border-r sm:border-t-0 sm:p-4"
    >
      {primaryNav.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 px-2 py-3 text-xs font-medium sm:flex-none sm:flex-row sm:justify-start sm:rounded-md sm:px-3 sm:py-2 sm:text-sm ${
              isActive
                ? "text-primary sm:bg-primary-muted/40"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
