"use client";

import { useActionState } from "react";
import type { Profile } from "@noyala/domain";
import {
  updateNotificationPreferences,
  type NotificationPreferencesState,
} from "@/server/profile/actions";

const initialState: NotificationPreferencesState = { status: "idle" };
const REMINDER_OFFSETS = [14, 7, 1, 0];

export function NotificationPreferencesForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(
    updateNotificationPreferences,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Preferred reminder channel</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="preferredReminderChannel"
            value="email"
            defaultChecked={profile.preferredReminderChannel === "email"}
          />
          Email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="preferredReminderChannel"
            value="push"
            defaultChecked={profile.preferredReminderChannel === "push"}
          />
          Push notification
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Remind me</legend>
        {REMINDER_OFFSETS.map((days) => (
          <label key={days} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="reminderOffsets"
              value={days}
              defaultChecked={profile.defaultReminderOffsets.includes(days)}
            />
            {days === 0 ? "On the day" : `${days} day${days === 1 ? "" : "s"} before`}
          </label>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="border-border w-fit rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save preferences"}
      </button>

      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.status === "error" ? "text-danger" : "text-success"}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
