"use client";

import { useActionState } from "react";
import type { InteractionType } from "@noyala/domain";
import type { InteractionFormState } from "@/server/interactions/actions";

const initialState: InteractionFormState = { status: "idle" };

const TYPES: { value: InteractionType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "visit", label: "Visit" },
  { value: "message", label: "Message" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

export function InteractionForm({
  action,
}: {
  action: (state: InteractionFormState, formData: FormData) => Promise<InteractionFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="border-border mt-3 flex flex-col gap-3 rounded-lg border p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm font-medium">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue="call"
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="occurredAt" className="text-sm font-medium">
            When
          </label>
          <input
            id="occurredAt"
            name="occurredAt"
            type="date"
            required
            defaultValue={today}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="summary" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="border-border w-fit rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Log interaction"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
