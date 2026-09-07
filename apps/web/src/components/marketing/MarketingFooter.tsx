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
    <footer className="border-marketing-hairline bg-marketing-paper mt-16 border-t sm:mt-20">
      <div className="mx-auto max-w-[1080px] px-5 py-9 sm:px-10 sm:py-14">
        <div className="mb-9 flex flex-wrap gap-9 sm:gap-14">
          <div className="flex-1 basis-[260px]">
            <p className="font-marketing-serif text-marketing-ink mb-3 text-[22px] leading-none">Noyala</p>
            <p className="text-marketing-grey max-w-[26em] text-[14.5px] leading-[1.7]">
              Designed for thoughtful relationships, with privacy and human judgement at its centre.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title} className="flex-none basis-[150px]">
              <p className="text-marketing-grey mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.09em]">
                {col.title}
              </p>
              <div className="grid justify-items-start gap-2.5">
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-marketing-ink min-h-7 text-left text-[14.5px] no-underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-marketing-hairline flex flex-wrap justify-between gap-4 border-t pt-5.5">
          <p className="text-marketing-grey text-[13.5px]">© 2026 Noyala. No advertising, no data sales.</p>
          <p className="text-marketing-grey text-[13.5px]">App Store and Google Play</p>
        </div>
      </div>
    </footer>
  );
}
