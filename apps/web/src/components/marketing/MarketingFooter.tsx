import Link from "next/link";

/** "Design notes" is deliberately not linked here — the design handoff's
 * README says not to ship that page publicly; it exists as an
 * implementation checklist (visit it directly at /design-notes). */
const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how" },
      { label: "Pricing", href: "/pricing" },
      { label: "Download", href: "/download" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Privacy and data", href: "/privacy" },
      { label: "Delete my account", href: "/account/delete" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Support", href: "/support" },
      { label: "Your account", href: "/account" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-marketing-hairline bg-marketing-paper border-t">
      {/* The columns sit on a real grid rather than three floated
          `basis-[150px]` boxes, so they line up at every width instead of
          drifting apart as the row rewraps. */}
      <div className="mx-auto w-full max-w-[1080px] px-5 py-12 sm:px-10 sm:py-16">
        <div className="mb-12 grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <p className="font-marketing-serif text-marketing-ink mb-3 text-[22px] leading-none">
              Noyala
            </p>
            <p className="text-marketing-grey max-w-[26em] text-[14.5px] leading-[1.7]">
              Designed for thoughtful relationships, with privacy and human judgement at its centre.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <p className="text-marketing-grey mb-4 text-[12.5px] font-semibold uppercase tracking-[0.09em]">
                {col.title}
              </p>
              <ul className="grid list-none justify-items-start gap-3 p-0">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-marketing-body hover:text-marketing-clay-text inline-flex min-h-7 items-center text-left text-[14.5px] no-underline transition-colors focus-visible:rounded-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-marketing-clay"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="border-marketing-hairline flex flex-wrap justify-between gap-4 border-t pt-5.5">
          <p className="text-marketing-grey text-[13.5px]">
            © 2026 Noyala. No advertising, no data sales.
          </p>
          <p className="text-marketing-grey text-[13.5px]">App Store and Google Play</p>
        </div>
      </div>
    </footer>
  );
}
