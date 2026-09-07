"use client";

import { useActionState, useEffect, useState } from "react";
import {
  requestLoginCode,
  verifyLoginCode,
  type RequestLoginCodeState,
  type VerifyLoginCodeState,
} from "./actions";

const initialRequestState: RequestLoginCodeState = { status: "idle" };
const initialVerifyState: VerifyLoginCodeState = { status: "idle" };

export function LoginForm() {
  const [requestState, requestAction, requestPending] = useActionState(
    requestLoginCode,
    initialRequestState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyLoginCode,
    initialVerifyState,
  );
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (requestState.status === "success" && requestState.email) {
      setEmail(requestState.email);
      setStep("code");
    }
  }, [requestState]);

  if (step === "code") {
    return (
      <form action={verifyAction} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="email" value={email} />
        <p className="text-ink-muted text-sm">
          We sent a 6-digit code to <span className="text-ink font-medium">{email}</span>.
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
          className="border-border rounded-md border px-3 py-2 text-center text-lg tracking-widest"
          aria-describedby={verifyState.message ? "login-message" : undefined}
        />
        <button
          type="submit"
          disabled={verifyPending}
          className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {verifyPending ? "Verifying…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={() => setStep("email")}
          className="text-primary text-sm underline"
        >
          Use a different email
        </button>
        {verifyState.status === "error" && verifyState.message ? (
          <p id="login-message" role="alert" className="text-danger text-sm">
            {verifyState.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form action={requestAction} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="text-ink text-sm font-medium">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        defaultValue={email}
        className="border-border rounded-md border px-3 py-2 text-sm"
        aria-describedby={requestState.message ? "login-message" : undefined}
      />
      <button
        type="submit"
        disabled={requestPending}
        className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {requestPending ? "Sending code…" : "Send me a code"}
      </button>
      {requestState.message ? (
        <p
          id="login-message"
          role="status"
          className={`text-sm ${requestState.status === "error" ? "text-danger" : "text-success"}`}
        >
          {requestState.message}
        </p>
      ) : null}
    </form>
  );
}
