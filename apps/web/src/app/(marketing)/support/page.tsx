import type { Metadata } from "next";
import { SupportFaqBrowser, type SupportFaq } from "@/components/marketing/SupportFaqBrowser";
import { SupportContactForm } from "@/components/marketing/SupportContactForm";

export const metadata: Metadata = { title: "Support" };

const TOPICS = [
  "All topics",
  "Getting started",
  "Contacts and permissions",
  "Memories and private notes",
  "Reminders",
  "Drafting and approval",
  "Shared circles",
  "Subscription and billing",
  "Exporting your data",
  "Deleting your account",
];

const FAQS: SupportFaq[] = [
  {
    topic: "Contacts and permissions",
    q: "Does Noyala read my address book?",
    a: "Only when you choose to pick someone from it. Your phone's own picker opens, hands back just the people you tap, and Noyala shows you every field it found before saving anything. You can also add people entirely by hand and never grant access at all.",
  },
  {
    topic: "Subscription and billing",
    q: "Where do I manage billing?",
    a: "In your account on this site, under Subscription. Cancelling leaves every person, note and date exactly where it is — only drafting, voice capture and gift lists stop.",
  },
  {
    topic: "Drafting and approval",
    q: "Can Noyala send a message for me?",
    a: "No. It writes options and stops. Handing a draft off opens your own messaging app with the text already there, and you press send yourself. There is no automatic sending in Noyala and there will not be one.",
  },
  {
    topic: "Exporting your data",
    q: "How do I export everything I have written?",
    a: "Sign in on this site, open your account, and choose Prepare my export. You get a readable file of every person, note, date and logged connection, with nothing stripped out. The download link lasts 24 hours.",
  },
  {
    topic: "Deleting your account",
    q: "How do I delete my account?",
    a: "Entirely on this site, without emailing anybody. Before you confirm, Noyala explains exactly what will be deleted and whether a recovery period applies. Where recovery is offered, signing in during that window cancels the deletion and puts everything back.",
  },
  {
    topic: "Memories and private notes",
    q: "What does marking a note private actually do?",
    a: "A private note is never used to draft a message and is never visible to anyone you share a circle with. It stays readable to you alone, on the person's profile.",
  },
  {
    topic: "Reminders",
    q: "Why is a reminder not appearing?",
    a: "Check that reminders are on in More, then Reminders, and that the lead time is what you expect. Noyala only reminds you about dates you have entered — it does not read your calendar.",
  },
  {
    topic: "Shared circles",
    q: "What happens to a circle if I leave it?",
    a: "You stop seeing everything shared into it immediately, and the other members stop seeing whatever you shared. Nothing you wrote is copied to them, and nothing they wrote stays with you.",
  },
  {
    topic: "Getting started",
    q: "Does Noyala work without an internet connection?",
    a: "Reading and writing notes works offline. Drafting a message and voice capture need a connection, because they run on our servers rather than on your phone.",
  },
  {
    topic: "Getting started",
    q: "Can I use Noyala on more than one phone?",
    a: "Yes. Sign in with the same email on each device. Signed-in devices are listed in your account here, and you can sign any of them out.",
  },
];

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-[820px] animate-[noy-fade_.3s_ease] px-5 py-11 sm:px-10 sm:py-20">
      <h1 className="font-marketing-serif mb-4 text-[clamp(32px,4.6vw,46px)] leading-[1.12] tracking-[-0.01em]">
        Support
      </h1>
      <p className="text-marketing-body mb-7 max-w-[32em] text-[17px] leading-[1.7]">
        Common questions first. If none of them match, a person answers the email — usually within
        a day.
      </p>

      <SupportFaqBrowser topics={TOPICS} faqs={FAQS} />

      <SupportContactForm />
    </main>
  );
}
