"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NoyalaLogo } from "@/components/marketing/NoyalaLogo";

/** "Account" lives with the CTA on the right, not in the main nav — it is a
 * destination for people who already have Noyala, not part of the pitch. */
const NAV_ITEMS = [
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/pricing" },
  { label: "Privacy", href: "/privacy" },
  { label: "Support", href: "/support" },
] as const;

const MENU_ITEMS = [...NAV_ITEMS, { label: "Account", href: "/account" }] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/#how") return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketing-clay focus-visible:rounded-[6px]";

export function MarketingHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-marketing-hairline bg-marketing-ivory/85 supports-[backdrop-filter]:bg-marketing-ivory/70 sticky top-0 z-20 border-b backdrop-blur-md">
      {/* `flex-nowrap` plus `flex-none` on the logo and the right-hand group is
          load-bearing: as flexible items they used to be shrunk below their
          own content width, which (together with a padding class that never
          compiled) left the CTA's label touching both edges of its pill. */}
      <div className="mx-auto flex max-w-[1080px] flex-nowrap items-center gap-3 px-5 py-3 sm:gap-6 sm:px-10">
        <Link
          href="/"
          aria-label="Noyala — home"
          className={`text-marketing-ink hover:text-marketing-clay-text flex-none no-underline transition-colors ${FOCUS}`}
          onClick={() => setMenuOpen(false)}
        >
          <NoyalaLogo markSize={30} wordmarkClassName="text-[22px] tracking-[0.01em]" />
        </Link>

        <nav aria-label="Main" className="navwide:flex hidden min-w-0 flex-1 items-center gap-5 xl:gap-7">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`min-h-11 whitespace-nowrap border-b-[1.5px] py-2 text-[14.5px] no-underline transition-colors ${FOCUS} ${
                  active
                    ? "border-marketing-clay text-marketing-clay-text font-medium"
                    : "text-marketing-body hover:text-marketing-ink hover:border-marketing-border border-transparent font-normal"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="navwide:hidden min-w-0 flex-1" />

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <Link
            href="/account"
            className={`navwide:inline-flex text-marketing-body hover:text-marketing-ink hidden min-h-11 items-center whitespace-nowrap px-1 text-[14.5px] no-underline transition-colors ${FOCUS}`}
          >
            Account
          </Link>
          <Link
            href="/download"
            className={`bg-marketing-action hover:bg-marketing-action-hover flex min-h-11 items-center whitespace-nowrap rounded-[10px] px-4.5 text-[14.5px] font-semibold text-white no-underline transition-colors ${FOCUS}`}
          >
            Get the app
          </Link>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="noy-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className={`navwide:hidden border-marketing-border bg-marketing-paper text-marketing-ink hover:border-marketing-clay flex min-h-11 min-w-11 items-center justify-center rounded-[10px] border transition-colors ${FOCUS}`}
          >
            <span aria-hidden="true" className="relative block h-[13px] w-[18px]">
              <span
                className={`bg-marketing-ink absolute left-0 block h-[1.5px] w-full rounded-full transition-transform duration-200 ${
                  menuOpen ? "top-[6px] rotate-45" : "top-0"
                }`}
              />
              <span
                className={`bg-marketing-ink absolute left-0 top-[6px] block h-[1.5px] w-full rounded-full transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`bg-marketing-ink absolute left-0 block h-[1.5px] w-full rounded-full transition-transform duration-200 ${
                  menuOpen ? "top-[6px] -rotate-45" : "top-[12px]"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          id="noy-menu"
          aria-label="Main"
          className="border-marketing-hairline bg-marketing-paper navwide:hidden animate-[noy-fade_.2s_ease] border-t px-5 pb-3.5 pt-1.5 sm:px-10"
        >
          {MENU_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                className={`border-marketing-hairline block min-h-[52px] border-b px-1 py-4 text-base no-underline transition-colors last:border-b-0 ${FOCUS} ${
                  active ? "text-marketing-clay-text font-semibold" : "text-marketing-ink hover:text-marketing-clay-text font-normal"
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
