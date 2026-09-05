"use client";

import { useActionState, useEffect, useState } from "react";
import type { ImportantDate } from "@noyala/domain";
import type { ImportantDateFormState } from "@/server/important-dates/actions";

const initialState: ImportantDateFormState = { status: "idle" };
const REMINDER_OFFSETS = [14, 7, 1, 0];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function ImportantDateForm({
  action,
  defaultValues,
  submitLabel,
}: {
  action: (state: ImportantDateFormState, formData: FormData) => Promise<ImportantDateFormState>;
  defaultValues?: Partial<ImportantDate>;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [timezone, setTimezone] = useState(defaultValues?.timezone ?? "UTC");

  useEffect(() => {
    if (defaultValues?.timezone) return;
    try {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      // Keep the UTC fallback.
    }
  }, [defaultValues?.timezone]);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="type" className="text-sm font-medium">
          Type
        </label>
        <select
          id="type"
          name="type"
          defaultValue={defaultValues?.type ?? "birthday"}
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="birthday">Birthday</option>
          <option value="anniversary">Anniversary</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="label" className="text-sm font-medium">
          Label
        </label>
        <input
          id="label"
          name="label"
          required
          defaultValue={defaultValues?.label ?? "Birthday"}
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="month" className="text-sm font-medium">
            Month
          </label>
          <select
            id="month"
            name="month"
            defaultValue={defaultValues?.month ?? 1}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {MONTHS.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="day" className="text-sm font-medium">
            Day
          </label>
          <input
            id="day"
            name="day"
            type="number"
            min={1}
            max={31}
            required
            defaultValue={defaultValues?.day ?? 1}
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="year" className="text-sm font-medium">
            Year (optional)
          </label>
          <input
            id="year"
            name="year"
            type="number"
            min={1900}
            max={2100}
            defaultValue={defaultValues?.year ?? ""}
            placeholder="Unknown"
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="recursAnnually"
          value="true"
          defaultChecked={defaultValues?.recursAnnually ?? true}
        />
        Repeats every year
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Remind me</legend>
        {REMINDER_OFFSETS.map((days) => (
          <label key={days} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="reminderOffsets"
              value={days}
              defaultChecked={defaultValues?.reminderOffsets?.includes(days) ?? true}
            />
            {days === 0 ? "On the day" : `${days} day${days === 1 ? "" : "s"} before`}
          </label>
        ))}
      </fieldset>

      <input type="hidden" name="timezone" value={timezone} readOnly />
      <p className="text-ink-muted text-xs">Timezone: {timezone}</p>

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
