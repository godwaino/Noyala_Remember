"use client";

import { useState } from "react";
import type { MessageAction, MessageChannel } from "@noyala/domain";
import { buildMailtoUrl, buildSmsUrl, buildWhatsAppUrl } from "./message-handoff-links";

export interface DraftCardData {
  id: string;
  label: string;
  content: string;
  channel: MessageChannel;
}

const ACTION_LABEL: Record<MessageAction, string> = {
  copied: "Copied to clipboard",
  opened_in_app: "Opened — not confirmed sent",
  marked_sent: "Marked as sent by you",
};

export function DraftCard({
  draft,
  person,
  occasion,
  updateContent,
  recordAction,
}: {
  draft: DraftCardData;
  person: { firstName: string; phone: string | null; email: string | null };
  occasion: string;
  /** Bound server action: (draftId, formData) => Promise<void> */
  updateContent: (draftId: string, formData: FormData) => Promise<void>;
  /** Bound server action: (draftId, action) => Promise<void> */
  recordAction: (draftId: string, action: MessageAction) => Promise<void>;
}) {
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<MessageAction | null>(null);

  async function saveEdits() {
    const formData = new FormData();
    formData.set("content", content);
    await updateContent(draft.id, formData);
  }

  async function handle(action: MessageAction, sideEffect?: () => void) {
    setBusy(true);
    try {
      await saveEdits();
      sideEffect?.();
      await recordAction(draft.id, action);
      setLastAction(action);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-4">
      <p className="text-ink-muted text-xs font-medium tracking-wide uppercase">{draft.label}</p>
      <textarea
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="border-border rounded-md border px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            handle("copied", () => {
              void navigator.clipboard.writeText(content);
            })
          }
          className="border-border rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          Copy
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            handle("opened_in_app", () => {
              window.open(buildWhatsAppUrl(person.phone, content), "_blank", "noopener");
            })
          }
          className="border-border rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          Open WhatsApp
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            handle("opened_in_app", () => {
              window.location.href = buildSmsUrl(person.phone, content);
            })
          }
          className="border-border rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          Open SMS
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            handle("opened_in_app", () => {
              window.location.href = buildMailtoUrl(person.email, occasion, content);
            })
          }
          className="border-border rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          Open Email
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => handle("marked_sent")}
          className="border-border text-primary rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
        >
          Mark as sent
        </button>
      </div>
      {lastAction ? (
        <p className="text-ink-muted text-xs">{ACTION_LABEL[lastAction]}</p>
      ) : null}
    </div>
  );
}
