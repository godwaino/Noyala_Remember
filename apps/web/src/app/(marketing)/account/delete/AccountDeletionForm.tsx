"use client";

import { useActionState, useEffect, useState } from "react";
import {
  requestDeletionReverificationCode,
  verifyDeletionReverificationCode,
  submitAccountDeletion,
  type RequestReverificationState,
  type VerifyReverificationState,
  type SubmitDeletionState,
} from "@/server/account/actions";

const initialRequestState: RequestReverificationState = { status: "idle" };
const initialVerifyState: VerifyReverificationState = { status: "idle" };
const initialSubmitState: SubmitDeletionState = { status: "idle" };

/**
 * Adapted from the design's "magic link" re-verification idea to this
 * codebase's actual sign-in pattern — a 6-digit code, not a clickable
 * link (see docs/decisions/0009-otp-code-sign-in.md). Four steps:
 * request a code, verify it, review consequences and confirm, done.
 */
export function AccountDeletionForm({ email }: { email: string }) {
  const [step, setStep] = useState<"reverify" | "code" | "confirm" | "scheduled">("reverify");

  const [requestState, requestAction, requestPending] = useActionState(
    requestDeletionReverificationCode,
    initialRequestState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyDeletionReverificationCode,
    initialVerifyState,
  );
  const [submitState, submitAction, submitPending] = useActionState(
    submitAccountDeletion,
    initialSubmitState,
  );

  useEffect(() => {
    if (requestState.status === "sent") setStep("code");
  }, [requestState]);

  useEffect(() => {
    if (verifyState.status === "verified") setStep("confirm");
  }, [verifyState]);

  useEffect(() => {
    if (submitState.status === "scheduled") setStep("scheduled");
  }, [submitState]);

  if (step === "scheduled" && submitState.status === "scheduled" && submitState.eraseAfter) {
    return (
      <div className="border-danger bg-danger/5 mt-6 rounded-md border p-4">
        <p className="text-ink font-medium">Deletion scheduled</p>
        <p className="text-ink-muted mt-1 text-sm">
          Your account will be permanently erased on{" "}
          {new Date(submitState.eraseAfter).toLocaleDateString(undefined, { dateStyle: "long" })}.
          Everything still works until then, and you can cancel any time before that date from{" "}
          <a href="/account" className="text-primary underline">
            your account page
          </a>
          .
        </p>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form action={submitAction} className="mt-6 flex flex-col gap-4">
        <div className="border-border rounded-md border p-4">
          <p className="text-ink text-sm font-medium">This will delete, after 30 days:</p>
          <ul className="text-ink-muted mt-2 list-disc pl-5 text-sm">
            <li>Every person, note, memory and important date you&apos;ve saved</li>
            <li>All message drafts and history</li>
            <li>Any circles you own, and your membership in others</li>
          </ul>
          <p className="text-ink-muted mt-2 text-sm">
            Until then, everything keeps working exactly as it does today.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="reason" className="text-ink text-sm font-medium">
            Why are you leaving? <span className="text-ink-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            maxLength={2000}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirmation" className="text-ink text-sm font-medium">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </label>
          <input
            id="confirmation"
            name="confirmation"
            required
            autoComplete="off"
            className="border-border w-40 rounded-md border px-3 py-2 text-sm"
            aria-describedby={submitState.message ? "delete-message" : undefined}
          />
        </div>

        <button
          type="submit"
          disabled={submitPending}
          className="border-danger text-danger w-fit rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {submitPending ? "Scheduling…" : "Schedule deletion"}
        </button>
        {submitState.status === "error" && submitState.message ? (
          <p id="delete-message" role="alert" className="text-danger text-sm">
            {submitState.message}
          </p>
        ) : null}
      </form>
    );
  }

  if (step === "code") {
    return (
      <form action={verifyAction} className="mt-6 flex flex-col gap-3">
        <p className="text-ink-muted text-sm">
          We sent a 6-digit code to <span className="text-ink font-medium">{email}</span> to
          confirm it&apos;s really you.
        </p>
        <label htmlFor="token" className="text-ink text-sm font-medium">
          Enter the code
        </label>
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          pattern="\d{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
          className="border-border w-40 rounded-md border px-3 py-2 text-center text-lg tracking-widest"
          aria-describedby={verifyState.message ? "verify-message" : undefined}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={verifyPending}
            className="bg-danger text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {verifyPending ? "Verifying…" : "Continue"}
          </button>
          <button
            type="button"
            onClick={() => setStep("reverify")}
            className="text-primary text-sm underline"
          >
            Send a new code
          </button>
        </div>
        {verifyState.status === "error" && verifyState.message ? (
          <p id="verify-message" role="alert" className="text-danger text-sm">
            {verifyState.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form action={requestAction} className="mt-6 flex flex-col gap-3">
      <p className="text-ink-muted text-sm">
        First, we&apos;ll confirm it&apos;s you — we&apos;ll send a 6-digit code to {email}.
      </p>
      <button
        type="submit"
        disabled={requestPending}
        className="border-danger text-danger w-fit rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {requestPending ? "Sending…" : "Send a verification code"}
      </button>
      {requestState.status === "error" && requestState.message ? (
        <p role="alert" className="text-danger text-sm">
          {requestState.message}
        </p>
      ) : null}
    </form>
  );
}
