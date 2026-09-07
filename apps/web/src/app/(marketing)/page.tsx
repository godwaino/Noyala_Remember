import type { Metadata } from "next";
import { MarketingLinkButton } from "@/components/marketing/MarketingButton";
import { PhoneMock } from "@/components/marketing/PhoneMock";

export const metadata: Metadata = { title: "Remember the person, not just the date" };

const PROMISES = [
  {
    title: "We do not sell or share your data",
    body: "Not to advertisers, not to data brokers, not to “partners”. Noyala makes money from subscriptions and nothing else, so there is nothing to sell you out for.",
  },
  {
    title: "No advertising, and no profiling for it",
    body: "Your relationships are not an audience segment. No advertising trackers, and no advertising identifiers. We keep minimal, privacy-respecting product analytics and crash reports so we can fix what breaks — never your relationship data, and never for profiling.",
  },
  {
    title: "Nothing is sent without your approval",
    body: "A generated message cannot leave Noyala on its own. It waits behind a tick box you have to read, and you press send in your own messaging app.",
  },
  {
    title: "Your notes remain yours to take or destroy",
    body: "Export the lot as a readable file whenever you want, and delete your account directly from the app or this site. Before you confirm, Noyala explains exactly what will be deleted and whether any recovery period applies.",
  },
];

/** Shared page gutter and measure. Every band on this page uses the same
 * two so the left edge of the copy never moves as you scroll. */
const SHELL = "mx-auto w-full max-w-[1080px] px-5 sm:px-10";

export default function LandingPage() {
  return (
    <main className="animate-[noy-fade_.3s_ease]">
      {/* Hero — the one band that gets extra air and the only one with a
          tinted ground, so the fold reads as the start of something. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="from-marketing-clay-wash pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-gradient-to-b to-transparent opacity-70"
        />
        <div className={`${SHELL} relative grid items-center gap-10 py-12 sm:gap-12 sm:py-24 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16`}>
          <div className="min-w-0">
            <p className="text-marketing-clay-text mb-5 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
              Remember the person, not just the date
            </p>
            <h1
              className="font-marketing-serif mb-5.5 max-w-[13em] text-[clamp(38px,6vw,64px)] font-light leading-[1.08] tracking-[-0.015em]"
              style={{ textWrap: "balance" }}
            >
              You already care. Noyala helps you show it.
            </h1>
            <p
              className="text-marketing-body mb-8 max-w-[34em] text-[clamp(17px,2vw,19px)] leading-[1.65]"
              style={{ textWrap: "pretty" }}
            >
              Keep the birthdays, the names, the small things people tell you. Noyala reminds you at
              the right moment and helps you find the words — then waits for you to read them and
              decide.
            </p>
            {/* One primary action. The old pair of equally-weighted
                "Download for iPhone" / "Download for Android" buttons both
                pointed at /download, and Android is not open yet — so the
                platform detail belongs on that page, not on two buttons
                here that promise a choice the site cannot honour. */}
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <MarketingLinkButton href="/download" className="min-h-[52px] px-6 text-base">
                Get Noyala
              </MarketingLinkButton>
              <MarketingLinkButton
                href="/#how"
                variant="secondary"
                className="min-h-[52px] px-6 text-base"
              >
                See how it works
              </MarketingLinkButton>
            </div>
            <p className="text-marketing-grey text-[15px] leading-[1.6]">
              Free to start, on iPhone today and Android soon. No advertising. Your notes are yours
              to export or delete.
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <PhoneMock width={340} height={588} shadow>
              <p className="text-marketing-grey mb-3.5 text-[13px] font-semibold uppercase tracking-[0.09em]">
                Tuesday morning
              </p>
              <h2 className="font-marketing-serif mb-2 text-[25px] leading-[1.2]">
                Two people this week
              </h2>
              <p className="text-marketing-grey mb-5 text-[13.5px] leading-[1.55]">
                Nothing urgent. Both are worth ten minutes.
              </p>
              <div className="border-marketing-border bg-marketing-paper mb-2.5 rounded-[14px] border p-[15px]">
                <p className="text-marketing-clay-text mb-2 text-[13px] font-semibold uppercase tracking-[0.08em]">
                  Thursday · birthday
                </p>
                <p className="font-marketing-serif mb-2 text-[18px] leading-[1.3]">
                  Daniel Osei turns 41
                </p>
                <p className="text-marketing-grey mb-3 text-[13px] leading-[1.5]">
                  He moved to Lisbon in March. Nina started school there.
                </p>
                <span className="bg-marketing-action flex min-h-11 items-center justify-center rounded-[9px] text-[13.5px] font-semibold text-white">
                  Prepare a message
                </span>
              </div>
              <div className="border-marketing-border bg-marketing-paper rounded-[14px] border p-[15px]">
                <p className="text-marketing-grey mb-2 text-[13px] font-semibold uppercase tracking-[0.08em]">
                  No date · been a while
                </p>
                <p className="font-marketing-serif mb-2 text-[18px] leading-[1.3]">Amara Nwosu</p>
                <p className="text-marketing-grey text-[13px] leading-[1.5]">
                  Four months since you last spoke. She was waiting on results.
                </p>
              </div>
            </PhoneMock>
          </div>
        </div>
      </section>

      {/* Definition band */}
      <section className="border-marketing-hairline bg-marketing-wash border-y">
        <div className={`${SHELL} py-10 sm:py-16`}>
          <p
            className="font-marketing-serif max-w-[26em] text-[clamp(22px,2.8vw,30px)] leading-[1.45]"
            style={{ textWrap: "pretty" }}
          >
            Noyala is a private notebook for your relationships. It holds what you know about people,
            tells you when it matters, and never speaks for you.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className={`${SHELL} py-14 sm:py-24`}>
        <div className="mb-10 max-w-[34em] sm:mb-16">
          <p className="text-marketing-clay-text mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
            How it works
          </p>
          <h2
            id="how"
            className="font-marketing-serif mb-3 scroll-mt-24 text-[clamp(28px,4vw,40px)] leading-[1.15] tracking-[-0.01em]"
            style={{ textWrap: "balance" }}
          >
            Three steps
          </h2>
          <p className="text-marketing-grey text-base leading-[1.7]">
            Write things down, get told at the right moment, and decide what to send.
          </p>
        </div>

        {/* Alternating sides. Three identical copy-left / phone-right rows
            was the flattest part of the page — the eye stopped reading by
            the second one. */}
        <div className="grid gap-14 sm:gap-24">
          <HowStep
            step={1}
            title="Write down what you know"
            lead="A name is enough to start. Then add the small things as you hear them — a new job, a hard month, the marathon they keep mentioning. One fact per note reads best a year later."
            note="Mark anything delicate as private and it stays out of drafts and out of shared circles."
          >
            <p className="text-marketing-grey mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
              Daniel Osei · memories
            </p>
            <MemoryRow text="Training for the Accra half-marathon in November" chip="Ordinary" />
            <MemoryRow text="Nina started school in Lisbon in March" chip="Ordinary" />
            <MemoryRow
              text="His father is unwell. Do not raise it first."
              chip="Private · never drafted"
              privateChip
            />
            <p className="text-marketing-grey mt-3.5 text-[13px] leading-[1.55]">
              Ordinary notes can inform a draft. Private ones never do.
            </p>
          </HowStep>

          <HowStep
            step={2}
            flip
            title="Be told at the right moment"
            lead="Birthdays and anniversaries come with as much warning as you ask for. People you have not spoken to in a while surface on their own, without a streak or a score attached."
            note="Noyala never claims you spoke to someone. It knows only what you tell it."
          >
            <p className="text-marketing-grey mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
              This month
            </p>
            <h4 className="font-marketing-serif mb-4 text-[22px] leading-[1.2]">September</h4>
            <AgendaRow date="Thu 10" title="Daniel Osei turns 41" meta="Birthday · 3 days’ warning" />
            <AgendaRow date="Sat 19" title="Kwame and Efua, 12 years" meta="Anniversary" />
            <AgendaRow date="—" title="Amara Nwosu" meta="4 months since you spoke" />
            <p className="text-marketing-grey mt-4 text-[13px] leading-[1.55]">
              No streaks. No score. An empty week is a real answer.
            </p>
          </HowStep>

          <HowStep
            step={3}
            title="Find the words, then decide"
            lead="Noyala reads your own notes and offers three ways to say it — warm and brief, built on a memory, or playful. You edit any of them, approve it by hand, and send it from your own app."
            note="You can always write it yourself. The drafts are a starting point, not the product."
          >
            <p className="text-marketing-grey mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
              Three options · Daniel
            </p>
            <DraftOption
              label="Warm and brief"
              body="Happy birthday, Daniel. 41 looks good on you. Thinking of you today."
            />
            <DraftOption
              label="Built on a memory"
              body="Happy birthday, Daniel. Still training for the Accra half? I want to hear how that is going."
              selected
            />
            <DraftOption
              label="Playful"
              body="41. Officially the age where you start recommending mattresses. Happy birthday, Daniel."
            />
            <p className="text-marketing-grey mt-3 text-[13px] leading-[1.55]">
              You edit, you approve, you press send.
            </p>
          </HowStep>
        </div>
      </section>

      {/* Approval */}
      <section className="border-marketing-hairline bg-marketing-paper border-t">
        <div className={`${SHELL} grid items-center gap-10 py-12 sm:gap-12 sm:py-24 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16`}>
          <div className="min-w-0 max-w-[34em]">
            <p className="text-marketing-clay-text mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
              Your hand on the send button
            </p>
            <h2
              className="font-marketing-serif mb-5 text-[clamp(28px,4vw,40px)] leading-[1.15] tracking-[-0.01em]"
              style={{ textWrap: "balance" }}
            >
              Nothing leaves your hands unread
            </h2>
            <div className="text-marketing-body mb-6.5 grid gap-4.5 text-[16.5px] leading-[1.7]">
              <p>
                Noyala can draft a message from what you have written down. It cannot send one. Every
                draft waits behind a tick box you have to read first.
              </p>
              <p>
                Noyala opens your sharing options with the approved message ready. You still choose
                the app, recipient and whether to press send.
              </p>
              <p>
                Notes you mark private are held back from drafting entirely, and from anyone you
                share a circle with.
              </p>
            </div>
            <MarketingLinkButton href="/privacy" variant="secondary">
              Read how we handle your data
            </MarketingLinkButton>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PhoneMock width={320} height={520}>
              <p className="text-marketing-clay-text mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
                Built on a memory
              </p>
              <div className="border-marketing-border bg-marketing-paper mb-2.5 rounded-[13px] border p-3.5">
                <p className="font-marketing-serif text-[16px] leading-[1.55]">
                  Happy birthday, Daniel. Still training for the Accra half? I want to hear how that
                  is going. Send me a voice note when you get a minute — I want the unedited version.
                </p>
              </div>
              <p className="text-marketing-grey mb-4 text-xs leading-[1.5]">
                228 characters · you can edit every word
              </p>
              <div className="border-marketing-clay bg-marketing-clay-wash mb-3 flex items-start gap-2.5 rounded-[13px] border p-3.5">
                <span
                  aria-hidden="true"
                  className="bg-marketing-action border-marketing-action flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border-[1.5px] text-xs font-semibold text-white"
                >
                  ✓
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium leading-[1.35]">
                    I have read this and I approve it
                  </span>
                  <span className="text-marketing-grey mt-1 block text-xs leading-[1.5]">
                    Noyala opens nothing until this is ticked.
                  </span>
                </span>
              </div>
              <span className="bg-marketing-action block min-h-[42px] rounded-[11px] p-3 text-center text-[14.5px] font-semibold text-white">
                Choose where to send
              </span>
            </PhoneMock>
          </div>
        </div>
      </section>

      {/* Promises */}
      <section className="border-marketing-hairline bg-marketing-ivory border-t">
        <div className={`${SHELL} py-14 sm:py-24`}>
          <div className="mb-10 max-w-[34em] sm:mb-14">
            <p className="text-marketing-clay-text mb-3.5 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
              Four commitments
            </p>
            <h2
              className="font-marketing-serif mb-3 text-[clamp(28px,4vw,40px)] leading-[1.15] tracking-[-0.01em]"
              style={{ textWrap: "balance" }}
            >
              What we promise, in plain words
            </h2>
            <p className="text-marketing-grey text-base leading-[1.7]">
              If any of them stops being true, we will say so before it changes.
            </p>
          </div>
          <ol className="border-marketing-border border-t">
            {PROMISES.map((p, i) => (
              <li
                key={p.title}
                className="border-marketing-border grid gap-3 border-b py-7 sm:grid-cols-[3rem_minmax(0,17rem)_minmax(0,1fr)] sm:gap-8"
              >
                <span
                  aria-hidden="true"
                  className="font-marketing-serif text-marketing-clay text-[19px] leading-[1.35]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="font-marketing-serif text-[clamp(20px,2.4vw,24px)] leading-[1.35]"
                  style={{ textWrap: "pretty" }}
                >
                  {p.title}
                </h3>
                <p
                  className="text-marketing-body max-w-[40em] text-base leading-[1.7]"
                  style={{ textWrap: "pretty" }}
                >
                  {p.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-marketing-sage border-marketing-hairline border-t text-white">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-8 py-14 sm:py-16`}>
          <div className="min-w-0 flex-1 basis-[320px]">
            <h2
              className="font-marketing-serif mb-3.5 text-[clamp(26px,3.6vw,36px)] leading-[1.2] text-white"
              style={{ textWrap: "balance" }}
            >
              Start with one person
            </h2>
            <p className="max-w-[30em] text-[16.5px] leading-[1.7] text-[#EDF0EC]">
              Add someone, write down one thing you know about them, and let Noyala carry it for you.
            </p>
          </div>
          <div className="flex flex-none flex-wrap items-center gap-4">
            <MarketingLinkButton
              href="/download"
              className="!bg-marketing-paper !text-marketing-ink hover:!bg-white min-h-[52px] px-6 text-base focus-visible:outline-white"
            >
              Get Noyala
            </MarketingLinkButton>
            <span className="text-[15px] leading-[1.6] text-[#EDF0EC]">Free to start</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function HowStep({
  step,
  title,
  lead,
  note,
  flip = false,
  children,
}: {
  step: number;
  title: string;
  lead: string;
  note: string;
  flip?: boolean;
  children: React.ReactNode;
}) {
  return (
    // The media column is sized to the mock itself rather than to half the
    // row, so the copy sits next to the phone instead of across a dead
    // gutter from it. `flip` swaps which side that column lands on.
    <div
      className={`grid items-center gap-8 lg:gap-16 ${
        flip ? "lg:grid-cols-[300px_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_300px]"
      }`}
    >
      <div className={`min-w-0 max-w-[34em] ${flip ? "lg:order-2" : ""}`}>
        <p className="text-marketing-clay-text mb-4 flex items-center gap-3 text-[12.5px] font-semibold uppercase tracking-[0.1em]">
          <span
            aria-hidden="true"
            className="border-marketing-clay text-marketing-clay-text flex h-7 w-7 flex-none items-center justify-center rounded-full border text-[13px]"
          >
            {step}
          </span>
          Step {["one", "two", "three"][step - 1]}
        </p>
        <h3
          className="font-marketing-serif mb-3.5 text-[clamp(23px,2.8vw,30px)] leading-[1.25]"
          style={{ textWrap: "balance" }}
        >
          {title}
        </h3>
        <p className="text-marketing-body mb-3.5 text-[16.5px] leading-[1.7]" style={{ textWrap: "pretty" }}>
          {lead}
        </p>
        <p className="text-marketing-grey border-marketing-border border-l pl-4 text-[14.5px] leading-[1.6]">
          {note}
        </p>
      </div>
      <div className={`flex justify-center ${flip ? "lg:order-1" : ""}`}>
        <PhoneMock width={300} height={476}>
          {children}
        </PhoneMock>
      </div>
    </div>
  );
}

function MemoryRow({ text, chip, privateChip = false }: { text: string; chip: string; privateChip?: boolean }) {
  return (
    <div className="border-marketing-border bg-marketing-paper mb-2.5 rounded-[13px] border p-3.5">
      <p className="font-marketing-serif mb-2.5 text-[15.5px] leading-[1.5]">{text}</p>
      <span
        className={`inline-block rounded-full px-2.5 py-1 text-[12.5px] font-medium ${
          privateChip
            ? "border-marketing-clay text-marketing-clay-text bg-marketing-clay-wash border"
            : "bg-marketing-wash text-marketing-grey"
        }`}
      >
        {chip}
      </span>
    </div>
  );
}

function AgendaRow({ date, title, meta }: { date: string; title: string; meta: string }) {
  return (
    <div className="border-marketing-hairline flex gap-3 border-b py-3.5">
      <span className="text-marketing-clay-text flex-none basis-[52px] text-[12.5px] font-medium leading-[1.4]">
        {date}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-medium leading-[1.35]">{title}</span>
        <span className="text-marketing-grey mt-0.5 block text-[12.5px] leading-[1.4]">{meta}</span>
      </span>
    </div>
  );
}

function DraftOption({ label, body, selected = false }: { label: string; body: string; selected?: boolean }) {
  return (
    <div
      className={`mb-2.5 rounded-[13px] border p-3.5 ${
        selected ? "border-marketing-clay bg-marketing-clay-wash" : "border-marketing-border bg-marketing-paper"
      }`}
    >
      <span className="text-marketing-clay-text mb-2 block text-[12.5px] font-semibold uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="font-marketing-serif block text-[14.5px] leading-[1.5]">{body}</span>
    </div>
  );
}
