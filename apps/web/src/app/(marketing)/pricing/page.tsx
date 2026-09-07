"use client";

import { useState } from "react";
import { FaqAccordion, type FaqEntry } from "@/components/marketing/FaqAccordion";
import { MarketingLinkButton } from "@/components/marketing/MarketingButton";

type Cycle = "monthly" | "annual";

const CYCLES: { key: Cycle; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "annual", label: "Yearly" },
];

function priceFaqs(cycle: Cycle): FaqEntry[] {
  return [
    {
      q: "Is there a trial?",
      a: "The free plan is the trial. It is not time-limited, and it holds unlimited people, notes and dates. You only need the paid plan for drafting, voice capture and gift lists.",
    },
    {
      q: "When does it renew?",
      a: `On the same date each ${cycle === "annual" ? "year" : "month"}, and we email you before it happens. Renewal prices do not change without notice.`,
    },
    {
      q: "What happens if I cancel?",
      a: "Every person, note, date and logged connection stays exactly where it is, and you keep writing. Drafting, voice capture and gift lists stop at the end of the period you have paid for.",
    },
    {
      q: "Who owns what I write?",
      a: "You do. Export it as a readable file at any point, on the free plan or the paid one, and delete it whenever you want.",
    },
  ];
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const cycleNote =
    cycle === "annual"
      ? "Billed once a year. Cancel any time; the plan runs to the end of the year you paid for."
      : "Billed every month. Cancel any time; the plan runs to the end of the month you paid for.";

  return (
    <main className="mx-auto max-w-[1080px] animate-[noy-fade_.3s_ease] px-5 py-11 sm:px-10 sm:py-20">
      <h1 className="font-marketing-serif mb-4 text-[clamp(32px,4.6vw,46px)] leading-[1.12] tracking-[-0.01em]">
        Pricing
      </h1>
      <p className="text-marketing-body mb-8 max-w-[34em] text-[17px] leading-[1.7] sm:mb-11">
        Nothing about your own data sits behind a payment. Free covers remembering people; Quiet pays
        for the drafting and the voice notes, which cost us money to run.
      </p>

      <div role="group" aria-label="Billing period" className="mb-3.5 flex max-w-[320px] gap-2">
        {CYCLES.map((c) => {
          const active = c.key === cycle;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCycle(c.key)}
              className={`min-h-11 flex-1 rounded-[10px] border px-3.5 text-[14.5px] font-medium ${
                active
                  ? "border-marketing-clay bg-marketing-clay-wash text-marketing-ink"
                  : "border-marketing-border bg-marketing-paper text-marketing-ink"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
      <p className="text-marketing-grey mb-7 max-w-[34em] text-[15px] leading-[1.7]">{cycleNote}</p>

      <div className="mb-9 flex flex-wrap gap-4">
        <div className="border-marketing-border bg-marketing-paper flex-1 basis-[300px] rounded-2xl border p-[clamp(22px,3vw,32px)]">
          <p className="text-marketing-action text-[12.5px] font-semibold uppercase tracking-[0.09em]">
            Always free
          </p>
          <h2 className="font-marketing-serif mt-3 mb-1.5 text-[28px] leading-[1.2]">Noyala</h2>
          <p className="mb-5 text-[17px] leading-[1.5]">No cost, no card</p>
          <div className="mb-6 grid gap-2.5">
            {[
              "Unlimited people, notes and dates",
              "Reminders with your own lead time",
              "Circles and sharing",
              "Export and delete, whenever",
            ].map((text) => (
              <p key={text} className="text-marketing-body flex gap-2.5 text-[15.5px] leading-[1.6]">
                <span aria-hidden="true" className="text-marketing-sage">
                  —
                </span>
                <span>{text}</span>
              </p>
            ))}
          </div>
          <MarketingLinkButton href="/download" variant="secondary" className="w-full">
            Get the app
          </MarketingLinkButton>
        </div>

        <div className="border-marketing-clay bg-marketing-clay-wash flex-1 basis-[300px] rounded-2xl border p-[clamp(22px,3vw,32px)]">
          <p className="text-marketing-action text-[12.5px] font-semibold uppercase tracking-[0.09em]">
            Subscription
          </p>
          <h2 className="font-marketing-serif mt-3 mb-1.5 text-[28px] leading-[1.2]">Noyala Quiet</h2>
          <p className="mb-2 text-[17px] leading-[1.5]">
            {cycle === "annual" ? "Yearly price to be confirmed" : "Monthly price to be confirmed"}
          </p>
          <p className="text-marketing-action-hover mb-5 text-[13px] font-medium leading-[1.5]">
            Placeholder — not yet approved
          </p>
          <div className="mb-6 grid gap-2.5">
            {[
              "Everything in the free app",
              "Three message options, as often as you like",
              "Voice capture with facts pulled out for you",
              "Gift lists with budgets and surprise mode",
            ].map((text) => (
              <p key={text} className="text-marketing-body flex gap-2.5 text-[15.5px] leading-[1.6]">
                <span aria-hidden="true" className="text-marketing-sage">
                  —
                </span>
                <span>{text}</span>
              </p>
            ))}
          </div>
          <MarketingLinkButton href="/download" variant="primary" className="w-full">
            Start with the app
          </MarketingLinkButton>
        </div>
      </div>

      <p className="text-marketing-grey mb-9 max-w-[34em] text-[15px] leading-[1.7] sm:mb-14">
        Cancelling Quiet leaves every person, note and date exactly where it is. You keep writing;
        Noyala simply stops drafting.
      </p>

      <h2 className="font-marketing-serif mb-4.5 text-[clamp(24px,3vw,30px)] leading-[1.2]">
        Questions about paying
      </h2>
      <FaqAccordion items={priceFaqs(cycle)} />
    </main>
  );
}
