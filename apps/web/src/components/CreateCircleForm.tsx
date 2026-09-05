"use client";

import { useActionState } from "react";
import { createCircle, type CircleFormState } from "@/server/circles/actions";

const initialState: CircleFormState = { status: "idle" };

export function CreateCircleForm() {
  const [state, formAction, isPending] = useActionState(createCircle, initialState);

  return (
    <form action={formAction} className="border-border mt-3 flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium">
          Circle name
        </label>
        <input
          id="name"
          name="name"
          required
          placeholder="The Smiths"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Creating…" : "Create circle"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger w-full text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
