import type { Metadata } from "next";
import { MarketingLinkButton } from "@/components/marketing/MarketingButton";

export const metadata: Metadata = { title: "Privacy and your data" };

const PRIVACY: { title: string; paras: string[] }[] = [
  {
    title: "Why this page is written like this",
    paras: [
      "Most of what Noyala holds is not about you. It is about your sister, your colleague, the friend going through a divorce — people who never signed up for anything. We treat their details as borrowed, not owned.",
      "So the rules below are stricter than the law requires in most places we operate.",
    ],
  },
  {
    title: "What we never do",
    paras: [
      "We do not sell your data, share it with advertisers, or use it to train models that anyone outside Noyala can query. We do not read your notes for product ideas.",
      "We do not use your notes to improve our own drafting quality either, unless you explicitly send us an example when contacting support.",
    ],
  },
  {
    title: "How drafting works",
    paras: [
      "When you ask for message options, the notes you have ticked — and only those — are sent to our language model provider to generate text. Notes marked private are excluded before anything leaves your phone.",
      "That provider processes the request and retains nothing. No draft is ever sent to a recipient by us, under any circumstances.",
    ],
  },
  {
    title: "Your contacts, and what we can see",
    paras: [
      "Noyala never reads your address book in the background. When you choose to add someone from it, your phone's own picker opens and hands back only the people you tapped — name, birthday and the fields shown to you on screen before anything is saved.",
      "You can decline the permission entirely and add everyone by hand. Nothing in the app stops working.",
    ],
  },
  {
    title: "Whether your notes train an AI model",
    paras: [
      "No. Your notes are not used to train our own models or anyone else's, and they are not retained by the provider that generates your drafts. We do not review your notes to improve drafting quality.",
      "The single exception is an example you deliberately paste into a support message, which we use only to answer that message.",
    ],
  },
  {
    title: "Voice capture",
    paras: [
      "Audio stays on your device until you accept a fact from it. The recording is transcribed, the facts are shown to you one at a time, and anything you reject is discarded immediately.",
      "Recordings delete themselves after thirty days whether or not you have reviewed them, and you can delete one at any point.",
    ],
  },
  {
    title: "Circles and sharing",
    paras: [
      "Sharing is per person and off by default. A circle member sees the dates and the notes you marked ordinary for the specific people you shared, and nothing else — not your other people, not your private notes, not your gift lists.",
      "Revoking is immediate and complete. Nothing they saw is copied into their own account.",
    ],
  },
  {
    title: "Where your data lives",
    paras: [
      "On servers in the European Union, encrypted at rest and in transit. Our own staff cannot read your notes in ordinary work; access requires an approved, logged reason.",
    ],
  },
];

const RETENTION: { what: string; why: string; howLong: string }[] = [
  { what: "People, notes and dates", why: "The point of the app", howLong: "Until you delete them" },
  { what: "Voice recordings", why: "So you can review the facts heard", howLong: "30 days, then automatic" },
  { what: "Generated drafts", why: "So you can come back to them", howLong: "Until you delete them" },
  { what: "Sign-in email address", why: "Authentication and receipts", howLong: "Life of the account" },
  { what: "Crash reports", why: "Fixing what breaks", howLong: "90 days, no note contents" },
  { what: "Deleted accounts", why: "A window to change your mind", howLong: "30 days, then erased" },
];

const PROCESSORS: { name: string; role: string; where: string }[] = [
  { name: "Supabase (EU region)", role: "Database, authentication and file storage", where: "European Union" },
  {
    name: "Language model provider",
    role: "Generates message options from the notes you tick",
    where: "European Union · retains nothing",
  },
  {
    name: "Speech-to-text provider",
    role: "Transcribes a voice capture you have recorded",
    where: "European Union · retains nothing",
  },
  { name: "Email provider", role: "Sign-in codes, receipts and deletion confirmations", where: "European Union" },
  { name: "Crash reporting", role: "Diagnostics when the app fails; no note contents", where: "European Union" },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-[760px] animate-[noy-fade_.3s_ease] px-5 py-11 sm:px-10 sm:py-20">
      <p className="text-marketing-action mb-4.5 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
        Last updated 12 August 2026
      </p>
      <h1 className="font-marketing-serif mb-4.5 text-[clamp(32px,4.6vw,46px)] leading-[1.12] tracking-[-0.01em]">
        Privacy and your data
      </h1>
      <p className="text-marketing-body mb-9 text-[18px] leading-[1.75]" style={{ textWrap: "pretty" }}>
        Noyala holds notes about people who never agreed to be in an app. That obligation shapes
        everything below. This page is the plain version; the formal policy sits underneath it and
        says the same thing.
      </p>

      {PRIVACY.map((section) => (
        <section key={section.title} className="border-marketing-border border-t py-7">
          <h2 className="font-marketing-serif mb-3.5 text-[clamp(22px,2.6vw,27px)] leading-[1.3]" style={{ textWrap: "pretty" }}>
            {section.title}
          </h2>
          {section.paras.map((text) => (
            <p key={text} className="text-marketing-body mb-3.5 text-[16.5px] leading-[1.75]" style={{ textWrap: "pretty" }}>
              {text}
            </p>
          ))}
        </section>
      ))}

      <section className="border-marketing-border border-t py-7">
        <h2 className="font-marketing-serif mb-4 text-[clamp(22px,2.6vw,27px)] leading-[1.3]">
          What we store, and for how long
        </h2>
        <div>
          {RETENTION.map((row) => (
            <div key={row.what} className="border-marketing-hairline flex flex-wrap gap-4 border-b py-3.5">
              <span className="flex-1 basis-[180px] text-[15.5px] font-medium leading-[1.5]">{row.what}</span>
              <span className="text-marketing-grey flex-1 basis-[200px] text-[15px] leading-[1.55]">{row.why}</span>
              <span className="flex-none basis-[130px] text-[15px] leading-[1.55]">{row.howLong}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-marketing-border border-t py-7">
        <h2 className="font-marketing-serif mb-3.5 text-[clamp(22px,2.6vw,27px)] leading-[1.3]">
          Who else touches your data
        </h2>
        <p className="text-marketing-body mb-4.5 text-[16.5px] leading-[1.75]">
          Five processors, named. Each one is bound by contract to process only what the task needs,
          and none of them may use your data for their own purposes.
        </p>
        <div>
          {PROCESSORS.map((p) => (
            <div key={p.name} className="border-marketing-hairline flex flex-wrap gap-4 border-b py-3.5">
              <span className="flex-1 basis-[180px] text-[15.5px] font-medium leading-[1.5]">{p.name}</span>
              <span className="text-marketing-grey flex-1 basis-[220px] text-[15px] leading-[1.55]">{p.role}</span>
              <span className="flex-none basis-[150px] text-[15px] leading-[1.55]">{p.where}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-marketing-border border-t pt-7">
        <h2 className="font-marketing-serif mb-3.5 text-[clamp(22px,2.6vw,27px)] leading-[1.3]">
          Taking your data, or ending it
        </h2>
        <p className="text-marketing-body mb-5 text-[16.5px] leading-[1.75]">
          Export gives you a readable file of every person, note and date. Deletion is immediate to
          you and final after thirty days, with no email exchange and nobody to persuade.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <MarketingLinkButton href="/account" variant="primary">
            Export my data
          </MarketingLinkButton>
          <MarketingLinkButton href="/account/delete" variant="secondary">
            Delete my account
          </MarketingLinkButton>
        </div>
      </section>
    </main>
  );
}
