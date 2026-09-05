"use client";

import { useActionState } from "react";
import { deleteAccount, type DeleteAccountState } from "@/server/account/actions";

const initialState: DeleteAccountState = { status: "idle" };

export function DeleteAccountForm() {
  const [state, formAction, isPending] = useActionState(deleteAccount, initialState);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2">
      <label htmlFor="confirmation" className="text-sm">
        Type <span className="font-mono font-semibold">DELETE</span> to confirm.
      </label>
      <input
        id="confirmation"
        name="confirmation"
        required
        className="border-border w-40 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="border-danger text-danger w-fit rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Deleting…" : "Permanently delete my account"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
