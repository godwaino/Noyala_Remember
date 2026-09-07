"use client";

import { useActionState } from "react";
import { sendSupportMessage, type SendSupportMessageState } from "@/server/support/actions";

const initialState: SendSupportMessageState = { status: "idle" };

export function SupportContactForm() {
  const [state, formAction, isPending] = useActionState(sendSupportMessage, initialState);

  return (
    <section className="border-marketing-border bg-marketing-paper rounded-2xl border p-[clamp(20px,3vw,32px)]">
      <h2 className="font-marketing-serif mb-2.5 text-[26px] leading-[1.25]">Write to us</h2>
      <p className="text-marketing-grey mb-5.5 max-w-[34em] text-[15.5px] leading-[1.7]">
        Tell us what happened and what you expected. Do not paste anyone else&apos;s personal
        details — we do not need them to help.
      </p>

      {state.status === "success" ? (
        <div role="status" className="border-marketing-sage-border bg-marketing-sage-wash rounded-xl border p-4.5">
          <p className="text-marketing-sage-deep mb-1.5 text-base font-medium leading-[1.4]">Message sent</p>
          <p className="text-marketing-body text-[14.5px] leading-[1.65]">
            A copy is on its way to {state.emailShown}. Reference {state.reference}.
          </p>
        </div>
      ) : (
        <form action={formAction}>
          <label htmlFor="sup-email" className="text-marketing-grey mb-2 block text-[13.5px] font-medium">
            Your email
          </label>
          <input
            id="sup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="border-marketing-border bg-marketing-ivory mb-4.5 min-h-[50px] w-full rounded-[10px] border px-3.5 text-base"
          />
          <label htmlFor="sup-msg" className="text-marketing-grey mb-2 block text-[13.5px] font-medium">
            What is happening
          </label>
          <textarea
            id="sup-msg"
            name="message"
            rows={5}
            required
            className="border-marketing-border bg-marketing-ivory mb-2 w-full resize-y rounded-[10px] border p-3.5 text-base leading-[1.6]"
          />
          {state.status === "error" && state.message ? (
            <p role="alert" className="text-marketing-red mb-2 text-sm font-medium leading-[1.6]">
              {state.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={isPending}
            className="bg-marketing-action min-h-12 rounded-[11px] px-5 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {isPending ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </section>
  );
}
