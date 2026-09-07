"use client";

import { useMemo, useState } from "react";
import { FaqAccordion, type FaqEntry } from "@/components/marketing/FaqAccordion";

export interface SupportFaq extends FaqEntry {
  topic: string;
}

export function SupportFaqBrowser({ topics, faqs }: { topics: string[]; faqs: SupportFaq[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<string>(topics[0] ?? "All topics");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesTopic = topic === "All topics" || faq.topic === topic;
      const matchesQuery = q === "" || faq.q.toLowerCase().includes(q) || faq.a.toLowerCase().includes(q);
      return matchesTopic && matchesQuery;
    });
  }, [faqs, query, topic]);

  return (
    <div>
      <label htmlFor="sup-q" className="sr-only">
        Search support
      </label>
      <input
        id="sup-q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search: export, deletion, reminders, circles"
        className="border-marketing-border bg-marketing-ivory mb-4.5 min-h-[52px] w-full rounded-[11px] border px-4 text-base"
      />
      <p className="text-marketing-grey mb-3 text-[13px] font-semibold uppercase tracking-[0.09em]">
        Or browse by topic
      </p>
      <div role="group" aria-label="Help topics" className="mb-6.5 flex flex-wrap gap-2">
        {topics.map((t) => {
          const active = t === topic;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTopic(t)}
              className={`min-h-11 rounded-[10px] border px-3.5 text-[14.5px] font-medium ${
                active
                  ? "border-marketing-clay bg-marketing-clay-wash text-marketing-ink"
                  : "border-marketing-border bg-marketing-paper text-marketing-ink"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {results.length === 0 ? (
        <p className="text-marketing-grey mb-6.5 text-base leading-[1.7]">
          Nothing matches that. Email us and quote the words you searched for.
        </p>
      ) : null}

      <div className="mb-10">
        <FaqAccordion items={results} />
      </div>
    </div>
  );
}
