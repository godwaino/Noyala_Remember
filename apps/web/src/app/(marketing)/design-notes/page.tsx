import type { Metadata } from "next";

// Implementation checklist carried over from the design handoff
// ("Noyala Web.dc.html" / README.md). Deliberately not linked from the
// public footer or nav — the README says not to ship it publicly.
export const metadata: Metadata = { title: "Design notes", robots: { index: false, follow: false } };

const STATE_NOTES: { where: string; states: string }[] = [
  { where: "Support", states: "Idle · searching with no match · form validation · sending · sent with a reference" },
  { where: "Account · export", states: "Idle · gathering · ready with a 24-hour link · failed with nothing lost" },
  {
    where: "Deletion",
    states:
      "Sign-in step · sending · expired code · sign-in failed · consequences · optional reason · typed confirmation · working · failed · scheduled",
  },
  { where: "Circle invitation", states: "Valid · expired · withdrawn · already accepted · not a real link" },
  { where: "Download", states: "Live listing · coming soon per platform · QR for desktop visitors" },
  { where: "Pricing", states: "Monthly and yearly billing · placeholder price · post-cancellation explanation" },
];

const PLACEHOLDERS: string[] = [
  "Paid plan price, billing period wording and renewal dates.",
  "Official App Store and Google Play badges, with real store links.",
  "QR code generated from the live store listing.",
  "Named processors and their regions, once contracts are signed.",
  "Hero phone illustration, to be swapped for a real product screenshot at 3× density.",
];

export default function DesignNotesPage() {
  return (
    <main className="mx-auto max-w-[820px] animate-[noy-fade_.3s_ease] px-5 py-11 sm:px-10 sm:py-20">
      <h1 className="font-marketing-serif mb-4 text-[clamp(30px,4.2vw,42px)] leading-[1.12] tracking-[-0.01em]">
        Design notes
      </h1>
      <p className="text-marketing-body mb-9 max-w-[34em] text-[17px] leading-[1.7]">
        Variants, states and behaviour for the pages in this canvas. Anything not yet decided by the
        business is labelled as a placeholder rather than invented. Not linked publicly — this page
        is the implementation checklist.
      </p>

      <section className="border-marketing-border border-t py-6.5">
        <h2 className="font-marketing-serif mb-4 text-2xl leading-[1.3]">Buttons</h2>
        <div className="mb-4 flex flex-wrap gap-2.5">
          <span className="bg-marketing-action inline-flex min-h-12 items-center rounded-[11px] px-5 text-[15px] font-semibold text-white">
            Primary · Clay
          </span>
          <span className="border-marketing-border bg-marketing-paper text-marketing-ink inline-flex min-h-12 items-center rounded-[11px] border px-5 text-[15px] font-semibold">
            Secondary
          </span>
          <span className="border-marketing-destructive-border bg-marketing-paper text-marketing-red inline-flex min-h-12 items-center rounded-[11px] border px-5 text-[15px] font-semibold">
            Destructive
          </span>
          <span className="bg-marketing-disabled inline-flex min-h-12 items-center rounded-[11px] px-5 text-[15px] font-semibold text-white">
            Disabled
          </span>
        </div>
        <p className="text-marketing-grey max-w-[38em] text-[15.5px] leading-[1.7]">
          Minimum target 48px high, 44px on inline controls. Focus is a 2.5px Clay outline offset by
          3px, never a colour change alone. Destructive actions stay outlined until the moment of
          confirmation.
        </p>
      </section>

      <section className="border-marketing-border border-t py-6.5">
        <h2 className="font-marketing-serif mb-4 text-2xl leading-[1.3]">Status treatments</h2>
        <div className="mb-4 grid gap-2.5">
          <div className="border-marketing-sage-border bg-marketing-sage-wash rounded-xl border p-3.5">
            <p className="text-marketing-sage-deep text-[15px] font-medium leading-[1.4]">
              Success · Forest Sage, always with a word such as &ldquo;ready&rdquo; or &ldquo;sent&rdquo;
            </p>
          </div>
          <div className="border-marketing-red-border bg-marketing-red-wash rounded-xl border p-3.5">
            <p className="text-marketing-red text-[15px] font-medium leading-[1.4]">
              Problem · always names what did not happen
            </p>
          </div>
          <div className="border-marketing-clay bg-marketing-clay-wash rounded-xl border p-3.5">
            <p className="text-marketing-clay-text text-[15px] font-medium leading-[1.4]">
              Privacy · Clay outline plus the word &ldquo;private&rdquo;
            </p>
          </div>
        </div>
        <p className="text-marketing-grey max-w-[38em] text-[15.5px] leading-[1.7]">
          No state is carried by colour alone. Loading regions announce themselves and say what is
          being waited for and roughly how long.
        </p>
      </section>

      <section className="border-marketing-border border-t py-6.5">
        <h2 className="font-marketing-serif mb-4 text-2xl leading-[1.3]">States built into this canvas</h2>
        <div>
          {STATE_NOTES.map((note) => (
            <div key={note.where} className="border-marketing-hairline flex flex-wrap gap-4 border-b py-3.5">
              <span className="flex-1 basis-[160px] text-[15.5px] font-medium leading-[1.5]">{note.where}</span>
              <span className="text-marketing-grey flex-[2] basis-[320px] text-[15px] leading-[1.65]">
                {note.states}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-marketing-border border-t py-6.5">
        <h2 className="font-marketing-serif mb-4 text-2xl leading-[1.3]">Responsive behaviour</h2>
        <p className="text-marketing-body mb-3 max-w-[38em] text-[15.5px] leading-[1.7]">
          Every page is fluid rather than three fixed layouts. Text columns cap at 32–42em so line
          length stays readable; phone illustrations sit beside the copy on wide screens and below it
          as a single stacked column on narrow ones.
        </p>
        <p className="text-marketing-body max-w-[38em] text-[15.5px] leading-[1.7]">
          Under 1000px the navigation collapses into a Menu button and &ldquo;Get the app&rdquo; stays
          visible in the bar. Comparison rows in Privacy and Pricing are flex rows that stack into
          label-and-value pairs rather than scrolling sideways.
        </p>
      </section>

      <section className="border-marketing-border border-t pt-6.5">
        <h2 className="font-marketing-serif mb-4 text-2xl leading-[1.3]">Placeholders to replace before launch</h2>
        <div>
          {PLACEHOLDERS.map((text) => (
            <p key={text} className="text-marketing-body mb-2.5 flex gap-2.5 text-[15.5px] leading-[1.7]">
              <span aria-hidden="true" className="text-marketing-clay-text">
                —
              </span>
              <span>{text}</span>
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}
