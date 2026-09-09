"use client";

import { useActionState } from "react";
import { cancelAccountDeletion, type CancelDeletionState } from "@/server/account/actions";

const initialState: CancelDeletionState = { status: "idle" };

export function CancelDeletionButton() {
  const [state, formAction, isPending] = useActionState(cancelAccountDeletion, initialState);

  if (state.status === "cancelled") {
    return (
      <p role="status" className="text-success mt-4 text-sm font-medium">
        Cancelled — your account is no longer scheduled for deletion.
      </p>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      <button
        type="submit"
        disabled={isPending}
        className="border-border rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Cancelling…" : "Cancel deletion"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger mt-2 text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
