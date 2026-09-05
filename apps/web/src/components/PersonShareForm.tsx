"use client";

import { useActionState } from "react";
import type { Circle } from "@noyala/domain";
import type { PersonShareFormState } from "@/server/person-shares/actions";

const initialState: PersonShareFormState = { status: "idle" };

export function PersonShareForm({
  action,
  circles,
}: {
  action: (state: PersonShareFormState, formData: FormData) => Promise<PersonShareFormState>;
  circles: Circle[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="border-border mt-3 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="circleId" className="text-sm font-medium">
          Share with circle
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
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="shareGiftPlanning" defaultChecked />
        Allow gift planning
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="shareMemories" />
        Share standard memories (sensitive memories are never shared)
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="border-border w-fit rounded-md border px-3 py-1.5 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Sharing…" : "Share"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
