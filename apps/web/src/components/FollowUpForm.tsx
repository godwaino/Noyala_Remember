"use client";

import { useActionState } from "react";
import type { FollowUpFormState } from "@/server/follow-ups/actions";

const initialState: FollowUpFormState = { status: "idle" };

export function FollowUpForm({
  action,
}: {
  action: (state: FollowUpFormState, formData: FormData) => Promise<FollowUpFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="border-border mt-3 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Follow up on
        </label>
        <input
          id="description"
          name="description"
          required
          placeholder="Ask how the interview went"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="dueAt" className="text-sm font-medium">
          Due (optional)
        </label>
        <input
          id="dueAt"
          name="dueAt"
          type="date"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="border-border w-fit rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Add follow-up"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
