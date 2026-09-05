"use client";

import { useActionState } from "react";
import type { CircleFormState } from "@/server/circles/actions";

const initialState: CircleFormState = { status: "idle" };

export function InviteToCircleForm({
  action,
}: {
  action: (state: CircleFormState, formData: FormData) => Promise<CircleFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="border-border mt-3 flex flex-wrap items-end gap-3 rounded-lg border p-4">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="invitedEmail" className="text-sm font-medium">
          Invite by email
        </label>
        <input
          id="invitedEmail"
          name="invitedEmail"
          type="email"
          required
          placeholder="name@example.com"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="role" className="text-sm font-medium">
          Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="viewer"
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="organiser">Organiser</option>
          <option value="viewer">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="border-border rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Sending…" : "Send invite"}
      </button>
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger w-full text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
