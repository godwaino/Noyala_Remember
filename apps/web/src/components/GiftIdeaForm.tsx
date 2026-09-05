"use client";

import { useActionState, useMemo, useState } from "react";
import { findLikelyDuplicateGiftIdeas, type Circle, type GiftIdeaStatus } from "@noyala/domain";
import type { GiftIdeaFormState } from "@/server/gift-ideas/actions";

const initialState: GiftIdeaFormState = { status: "idle" };

export function GiftIdeaForm({
  action,
  circles,
  existingIdeas,
}: {
  action: (state: GiftIdeaFormState, formData: FormData) => Promise<GiftIdeaFormState>;
  circles: Circle[];
  existingIdeas: { id: string; title: string; status: GiftIdeaStatus }[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState("");

  // Client-side only, live as you type — no round trip needed since this
  // is a pure function over data already on the page. Never blocks
  // submission; it's a warning, not a validation error.
  const duplicates = useMemo(
    () => findLikelyDuplicateGiftIdeas(title, existingIdeas),
    [title, existingIdeas],
  );

  return (
    <form action={formAction} className="border-border mt-3 flex flex-col gap-3 rounded-lg border p-4">
      {circles.length > 1 ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="circleId" className="text-sm font-medium">
            Circle
          </label>
          <select
            id="circleId"
            name="circleId"
            required
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {circles.map((circle) => (
              <option key={circle.id} value={circle.id}>
                {circle.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="circleId" value={circles[0]?.id} />
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Gift idea
        </label>
        <input
          id="title"
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Noise-cancelling headphones"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
        {duplicates.length > 0 ? (
          <p className="text-accent text-xs">
            Looks similar to {duplicates.map((d) => `"${d.title}"`).join(", ")} — already{" "}
            {duplicates.some((d) => d.status !== "idea") ? "being planned" : "suggested"}.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium">
          Notes (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={2}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="occasion" className="text-sm font-medium">
            Occasion (optional)
          </label>
          <input
            id="occasion"
            name="occasion"
            placeholder="Birthday"
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="deadlineAt" className="text-sm font-medium">
            Needed by (optional)
          </label>
          <input
            id="deadlineAt"
            name="deadlineAt"
            type="date"
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="budgetAmount" className="text-sm font-medium">
            Budget (optional)
          </label>
          <input
            id="budgetAmount"
            name="budgetAmount"
            type="number"
            min="0"
            step="0.01"
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="budgetCurrency" className="text-sm font-medium">
            Currency
          </label>
          <select
            id="budgetCurrency"
            name="budgetCurrency"
            defaultValue="GBP"
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            <option value="GBP">GBP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="linkUrl" className="text-sm font-medium">
          Link (optional)
        </label>
        <input
          id="linkUrl"
          name="linkUrl"
          type="url"
          placeholder="https://…"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="border-border w-fit rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Adding…" : "Add gift idea"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
