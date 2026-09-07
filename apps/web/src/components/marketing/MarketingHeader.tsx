"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
  { label: "Account", href: "/account" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/#how") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-marketing-hairline bg-marketing-ivory/95 sticky top-0 z-20 border-b backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center gap-3 px-5 py-3.5 sm:gap-6 sm:px-10">
        <Link
          href="/"
          className="font-marketing-serif text-marketing-ink text-[22px] leading-none tracking-[0.01em] no-underline"
          onClick={() => setMenuOpen(false)}
        >
          Noyala
        </Link>

        <nav aria-label="Main" className="navwide:flex hidden flex-1 flex-wrap items-center gap-5 xl:gap-6">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-11 whitespace-nowrap border-b-[1.5px] py-2 text-[14.5px] no-underline ${
                  active
                    ? "border-marketing-action text-marketing-action font-semibold"
                    : "text-marketing-ink hover:text-marketing-action border-transparent font-normal"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="navwide:hidden flex-1" />

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="noy-menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="navwide:hidden border-marketing-border bg-marketing-paper text-marketing-ink min-h-11 min-w-11 rounded-[10px] border px-3.5 text-[14.5px] font-medium"
        >
          {menuOpen ? "Close menu" : "Menu"}
        </button>

        <Link
          href="/download"
          className="bg-marketing-action flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-4.5 text-[14.5px] font-semibold text-white no-underline"
        >
          Get the app
        </Link>
      </div>

      {menuOpen ? (
        <nav
          id="noy-menu"
          aria-label="Main"
          className="border-marketing-hairline bg-marketing-paper navwide:hidden border-t px-5 pb-3.5 pt-1.5 sm:px-10"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`border-marketing-hairline block min-h-[52px] border-b px-1 py-4 text-base no-underline last:border-b-0 ${
                  active ? "text-marketing-action font-semibold" : "text-marketing-ink font-normal"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      ) : null}
    </header>
  );
}
