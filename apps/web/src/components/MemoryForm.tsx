"use client";

import { useActionState } from "react";
import type { Memory } from "@noyala/domain";
import type { MemoryFormState } from "@/server/memories/actions";

const initialState: MemoryFormState = { status: "idle" };

const CATEGORIES: Memory["category"][] = [
  "general",
  "family",
  "work",
  "interest",
  "milestone",
  "gift",
  "preference",
];

export function MemoryForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: MemoryFormState, formData: FormData) => Promise<MemoryFormState>;
  defaultValues?: Partial<Memory>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="content" className="text-sm font-medium">
          What do you want to remember?
        </label>
        <textarea
          id="content"
          name="content"
          required
          rows={3}
          defaultValue={defaultValues?.content}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="category" className="text-sm font-medium">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaultValues?.category ?? "general"}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="occurredOn" className="text-sm font-medium">
            When (optional)
          </label>
          <input
            id="occurredOn"
            name="occurredOn"
            type="date"
            defaultValue={defaultValues?.occurredOn ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Sensitivity</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="sensitivity"
            value="standard"
            defaultChecked={(defaultValues?.sensitivity ?? "standard") === "standard"}
          />
          Standard — may be used to draft messages
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="sensitivity"
            value="sensitive"
            defaultChecked={defaultValues?.sensitivity === "sensitive"}
          />
          Sensitive — excluded from message drafts unless I explicitly include it
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface w-fit rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
