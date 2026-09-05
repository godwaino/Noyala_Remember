"use client";

import { useState } from "react";
import type { Memory } from "@noyala/domain";

export interface PrepNextDate {
  label: string;
  daysUntil: number | null;
}

/**
 * A concise, read-only summary for catching up before reaching out —
 * Master Build Prompt §4's "conversation-preparation card ... based only
 * on relevant approved memories." Sensitive memories stay excluded by
 * default even here (a purely local, read-only display) — consistent with
 * the exit gate's "sensitive/private memories stay excluded under all
 * default paths" — with an explicit reveal rather than silently including
 * them.
 */
export function ConversationPrepCard({
  memories,
  nextDate,
}: {
  memories: Memory[];
  nextDate: PrepNextDate | null;
}) {
  const [showSensitive, setShowSensitive] = useState(false);
  const standard = memories.filter((m) => m.sensitivity === "standard").slice(0, 4);
  const sensitive = memories.filter((m) => m.sensitivity === "sensitive");

  if (standard.length === 0 && sensitive.length === 0 && !nextDate) return null;

  return (
    <div className="border-border bg-surface mt-4 rounded-lg border p-4">
      <p className="text-ink-muted text-xs font-medium tracking-wide uppercase">
        Before you reach out
      </p>
      {nextDate ? (
        <p className="text-ink mt-2 text-sm">
          {nextDate.label}
          {nextDate.daysUntil !== null
            ? nextDate.daysUntil === 0
              ? " is today"
              : ` in ${nextDate.daysUntil} day${nextDate.daysUntil === 1 ? "" : "s"}`
            : ""}
        </p>
      ) : null}
      {standard.length > 0 ? (
        <ul className="text-ink mt-2 list-inside list-disc text-sm">
          {standard.map((m) => (
            <li key={m.id}>{m.content}</li>
          ))}
        </ul>
      ) : null}
      {sensitive.length > 0 ? (
        showSensitive ? (
          <ul className="text-ink mt-2 list-inside list-disc text-sm">
            {sensitive.map((m) => (
              <li key={m.id}>{m.content}</li>
            ))}
          </ul>
        ) : (
          <button
            type="button"
            onClick={() => setShowSensitive(true)}
            className="text-primary mt-2 text-xs underline"
          >
            Show {sensitive.length} sensitive detail{sensitive.length === 1 ? "" : "s"}
          </button>
        )
      ) : null}
    </div>
  );
}
