"use client";

import { useState } from "react";

export interface FaqEntry {
  q: string;
  a: string;
}

export function FaqAccordion({ items, emptyMessage }: { items: FaqEntry[]; emptyMessage?: string }) {
  const [open, setOpen] = useState<string | null>(null);

  if (items.length === 0) {
    return emptyMessage ? <p className="text-marketing-grey text-base leading-[1.7]">{emptyMessage}</p> : null;
  }

  return (
    <div>
      {items.map((item) => {
        const isOpen = open === item.q;
        return (
          <div key={item.q} className="border-marketing-border border-t">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.q)}
              className="flex min-h-[60px] w-full items-center justify-between gap-4 bg-transparent py-4.5 text-left"
            >
              <span className="font-marketing-serif min-w-0 flex-1 text-[19px] leading-[1.4]">{item.q}</span>
              <span
                aria-hidden="true"
                className="text-marketing-clay-text flex-none text-[22px] leading-none transition-transform duration-200"
                style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            {isOpen ? (
              <p className="text-marketing-body mb-5.5 max-w-[42em] text-base leading-[1.75]" style={{ textWrap: "pretty" }}>
                {item.a}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
