"use client";

import { useActionState, useEffect, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

const initialState: OnboardingState = { status: "idle" };
const REMINDER_OFFSETS = [14, 7, 1, 0];

export function OnboardingForm({ displayNameHint }: { displayNameHint?: string }) {
  const [state, formAction, isPending] = useActionState(
    completeOnboarding,
    initialState,
  );
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // Keep the UTC fallback.
    }
  }, []);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor="displayName" className="text-sm font-medium">
          What should we call you?
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          defaultValue={displayNameHint}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <input
          id="timezone"
          name="timezone"
          required
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
        <p className="text-ink-muted text-xs">
          Detected automatically. Edit it if it&apos;s wrong.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Remind me</legend>
        {REMINDER_OFFSETS.map((days) => (
          <label key={days} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="reminderOffsets"
              value={days}
              defaultChecked
              className="rounded"
            />
            {days === 0 ? "On the day" : `${days} day${days === 1 ? "" : "s"} before`}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Preferred reminder channel</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="preferredReminderChannel" value="email" defaultChecked />
          Email
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="preferredReminderChannel" value="push" />
          Push notification
        </label>
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="defaultTone" className="text-sm font-medium">
          Default message tone
        </label>
        <select
          id="defaultTone"
          name="defaultTone"
          defaultValue="thoughtful"
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="short_and_warm">Short and warm</option>
          <option value="thoughtful">Thoughtful</option>
          <option value="funny">Funny</option>
          <option value="professional">Professional</option>
          <option value="faith_based">Faith-based</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="acknowledgedMemoryUsage"
          value="true"
          required
          className="mt-0.5 rounded"
        />
        <span>
          I understand personal details I save may be used to help draft
          messages, and I control what gets included each time.
        </span>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Finish setup"}
      </button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
