"use client";

import { useActionState } from "react";
import type { CircleFormState } from "@/server/circles/actions";

const initialState: CircleFormState = { status: "idle" };

export function AcceptInvitationButton({
  action,
}: {
  action: (state: CircleFormState, formData: FormData) => Promise<CircleFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-60"
      >
        {isPending ? "Joining…" : "Accept"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-xs">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
