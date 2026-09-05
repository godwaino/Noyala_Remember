"use client";

import { useActionState, useState } from "react";
import type { ImportantDate, Memory } from "@noyala/domain";
import type { GenerateDraftFormState } from "@/server/messages/actions";

const initialState: GenerateDraftFormState = { status: "idle" };

const TONES: { value: string; label: string }[] = [
  { value: "short_and_warm", label: "Short and warm" },
  { value: "thoughtful", label: "Thoughtful" },
  { value: "funny", label: "Funny" },
  { value: "professional", label: "Professional" },
  { value: "faith_based", label: "Faith-based" },
  { value: "custom", label: "Custom" },
];

const CHANNELS: { value: string; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];

export interface MessageStudioPrefill {
  occasion?: string;
  tone?: string;
  channel?: string;
  customInstruction?: string;
  importantDateId?: string;
  selectedMemoryIds?: string[];
}

export function MessageStudioForm({
  action,
  memories,
  importantDates,
  prefill,
}: {
  action: (state: GenerateDraftFormState, formData: FormData) => Promise<GenerateDraftFormState>;
  memories: Memory[];
  importantDates: ImportantDate[];
  prefill?: MessageStudioPrefill;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [occasion, setOccasion] = useState(prefill?.occasion ?? "");
  const selectedMemoryIds = new Set(prefill?.selectedMemoryIds ?? []);

  const standardMemories = memories.filter((m) => m.sensitivity === "standard");
  const sensitiveMemories = memories.filter((m) => m.sensitivity === "sensitive");

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="importantDateId" className="text-sm font-medium">
          Link to a date (optional)
        </label>
        <select
          id="importantDateId"
          name="importantDateId"
          defaultValue={prefill?.importantDateId ?? ""}
          onChange={(e) => {
            const date = importantDates.find((d) => d.id === e.target.value);
            if (date) setOccasion(date.label);
          }}
          className="border-border rounded-md border px-3 py-2 text-sm"
        >
          <option value="">None</option>
          {importantDates.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label} ({d.month}/{d.day})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="occasion" className="text-sm font-medium">
          Occasion
        </label>
        <input
          id="occasion"
          name="occasion"
          required
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          placeholder="Birthday, Anniversary, Just because…"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="tone" className="text-sm font-medium">
            Tone
          </label>
          <select
            id="tone"
            name="tone"
            defaultValue={prefill?.tone ?? "thoughtful"}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {TONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="channel" className="text-sm font-medium">
            Channel
          </label>
          <select
            id="channel"
            name="channel"
            defaultValue={prefill?.channel ?? "whatsapp"}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="customInstruction" className="text-sm font-medium">
          Custom instruction (optional)
        </label>
        <textarea
          id="customInstruction"
          name="customInstruction"
          rows={2}
          defaultValue={prefill?.customInstruction ?? ""}
          placeholder="Mention that we're meeting up next week…"
          className="border-border rounded-md border px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Include these details</legend>
        {standardMemories.length === 0 ? (
          <p className="text-ink-muted text-sm">No saved memories yet for this person.</p>
        ) : (
          standardMemories.map((m) => (
            <label key={m.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="memoryIds"
                value={m.id}
                defaultChecked={
                  prefill?.selectedMemoryIds ? selectedMemoryIds.has(m.id) : true
                }
              />
              <span>{m.content}</span>
            </label>
          ))
        )}
      </fieldset>

      {sensitiveMemories.length > 0 ? (
        <fieldset className="border-border flex flex-col gap-2 rounded-md border border-dashed p-3">
          <legend className="text-ink-muted px-1 text-xs font-medium">
            Sensitive — excluded by default. Check to include just this once.
          </legend>
          {sensitiveMemories.map((m) => (
            <label key={m.id} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="memoryIds"
                value={m.id}
                defaultChecked={selectedMemoryIds.has(m.id)}
              />
              <span>{m.content}</span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-surface w-fit rounded-md px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? "Generating…" : "Generate 3 options"}
      </button>

      {state.status === "error" && state.message ? (
        <p role="alert" className="text-danger text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
