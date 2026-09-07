import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Get Noyala" };

export default function DownloadPage() {
  return (
    <main className="mx-auto max-w-[1080px] animate-[noy-fade_.3s_ease] px-5 py-11 sm:px-10 sm:py-20">
      <h1 className="font-marketing-serif mb-4 text-[clamp(32px,4.6vw,46px)] leading-[1.12] tracking-[-0.01em]">
        Get Noyala
      </h1>
      <p className="text-marketing-body mb-8 max-w-[32em] text-[17px] leading-[1.7]">
        One app, both platforms. Your account works on either, and sign-in is a code sent to your
        email — no password to lose.
      </p>

      <div className="mb-5 flex flex-wrap items-start gap-5">
        <div className="grid flex-1 basis-[300px] gap-3">
          <div className="border-marketing-placeholder-border bg-marketing-paper rounded-[14px] border border-dashed p-[18px]">
            <p className="text-marketing-grey mb-2.5 text-[13px] font-semibold uppercase tracking-[0.09em]">
              iPhone and iPad
            </p>
            <div
              aria-hidden="true"
              className="bg-marketing-ink text-marketing-ivory mb-2.5 flex h-14 items-center justify-center rounded-[9px] text-[15px] font-medium"
            >
              Official App Store badge
            </div>
            <p className="text-marketing-grey text-[14.5px] leading-[1.6]">
              Placeholder. The real badge and link go in once the store listing is live.
            </p>
          </div>
          <div className="border-marketing-placeholder-border bg-marketing-paper rounded-[14px] border border-dashed p-[18px]">
            <p className="text-marketing-grey mb-2.5 text-[13px] font-semibold uppercase tracking-[0.09em]">
              Android
            </p>
            <div
              aria-hidden="true"
              className="bg-marketing-ink text-marketing-ivory mb-2.5 flex h-14 items-center justify-center rounded-[9px] text-[15px] font-medium"
            >
              Official Google Play badge
            </div>
            <p className="text-marketing-clay-text mb-1 text-[14.5px] font-medium leading-[1.6]">Coming soon</p>
            <p className="text-marketing-grey text-[14.5px] leading-[1.6]">
              The Android listing is not open yet. Leave your email on the support page and we will
              tell you when it is.
            </p>
          </div>
        </div>
        <div className="border-marketing-border bg-marketing-paper flex-none basis-[260px] rounded-[14px] border p-[18px]">
          <p className="text-marketing-grey mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
            On a computer?
          </p>
          <div
            aria-hidden="true"
            className="border-marketing-placeholder-border bg-marketing-ivory text-marketing-grey mb-3 flex h-[150px] items-center justify-center rounded-[10px] border border-dashed p-3 text-center text-[14.5px] leading-[1.5]"
          >
            QR code placeholder
          </div>
          <p className="text-marketing-grey text-[14.5px] leading-[1.6]">
            Point your phone camera here and the store page opens on the device you will actually use
            Noyala on.
          </p>
        </div>
      </div>

      <div className="mb-9 flex flex-wrap gap-5">
        <div className="flex-1 basis-[280px]">
          <h2 className="font-marketing-serif mb-2.5 text-[21px] leading-[1.3]">What you need</h2>
          <p className="text-marketing-body text-[15.5px] leading-[1.7]">
            iOS 16 or later, or Android 10 or later. Around 25 MB. Reading and writing notes works
            offline; drafting and voice capture need a connection.
          </p>
        </div>
        <div className="flex-1 basis-[280px]">
          <h2 className="font-marketing-serif mb-2.5 text-[21px] leading-[1.3]">Why it is a phone app</h2>
          <p className="text-marketing-body text-[15.5px] leading-[1.7]">
            You hear the things worth remembering while you are out, and you send the message from the
            same place. The web is here for your account, your data and your subscription — not for a
            second copy of the app.
          </p>
        </div>
      </div>

      <div className="border-marketing-border grid max-w-[34em] gap-5 border-t pt-7">
        <div>
          <h2 className="font-marketing-serif mb-2 text-[21px] leading-[1.3]">Already have an account?</h2>
          <p className="text-marketing-body text-[15.5px] leading-[1.7]">
            Install the app and sign in with the same email. Everything comes back — people, notes,
            dates, circles.
          </p>
        </div>
        <div>
          <h2 className="font-marketing-serif mb-2 text-[21px] leading-[1.3]">No smartphone to hand?</h2>
          <p className="text-marketing-body text-[15.5px] leading-[1.7]">
            Account management, data export and deletion all work here on the web.{" "}
            <Link href="/account">Manage your account</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
