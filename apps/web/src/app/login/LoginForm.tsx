"use client";

import { useActionState } from "react";
import { requestMagicLink, type RequestMagicLinkState } from "./actions";

const initialState: RequestMagicLinkState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    requestMagicLink,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <label htmlFor="email" className="text-ink text-sm font-medium">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="border-border rounded-md border px-3 py-2 text-sm"
        aria-describedby={state.message ? "login-message" : undefined}
      />
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Sending link…" : "Send me a sign-in link"}
      </button>
      {state.message ? (
        <p
          id="login-message"
          role="status"
          className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
