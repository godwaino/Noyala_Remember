"use client";

import { useActionState, useEffect, useState } from "react";
import {
  acceptInvitation,
  declineInvitationByToken,
  type CircleFormState,
} from "@/server/circles/actions";

const initialState: CircleFormState = { status: "idle" };

/** Declining stays on this page (no navigation) — so it needs its own
 * "declined" flag rather than reading state off the action result, since
 * the action's success state is indistinguishable from its initial idle
 * state. Accepting does navigate, via the server action's own redirect. */
export function InviteResponse({ token }: { token: string }) {
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptInvitation.bind(null, token),
    initialState,
  );
  const [declineState, declineAction, declinePending] = useActionState(
    declineInvitationByToken.bind(null, token),
    initialState,
  );
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    if (declineState.status === "idle" && !declinePending && declineState !== initialState) {
      setDeclined(true);
    }
  }, [declineState, declinePending]);

  if (declined) {
    return (
      <p className="text-ink-muted text-sm">
        You declined this invitation. Nothing else to do here.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <form action={acceptAction}>
          <button
            type="submit"
            disabled={acceptPending || declinePending}
            className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {acceptPending ? "Joining…" : "Accept and join"}
          </button>
        </form>
        <form action={declineAction}>
          <button
            type="submit"
            disabled={acceptPending || declinePending}
            className="border-border rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {declinePending ? "Declining…" : "Decline"}
          </button>
        </form>
      </div>
      {acceptState.status === "error" && acceptState.message ? (
        <p role="alert" className="text-danger text-sm">
          {acceptState.message}
        </p>
      ) : null}
      {declineState.status === "error" && declineState.message ? (
        <p role="alert" className="text-danger text-sm">
          {declineState.message}
        </p>
      ) : null}
    </div>
  );
}
