import Link from "next/link";
import type { UpcomingBucket } from "@noyala/domain";
import type { ResolvedUpcomingDate } from "@/server/important-dates/upcoming";

const GROUPS: { bucket: UpcomingBucket; title: string }[] = [
  { bucket: "today", title: "Today" },
  { bucket: "next7", title: "Next 7 days" },
  { bucket: "next30", title: "Next 30 days" },
  { bucket: "later", title: "Later" },
];

export function UpcomingDateGroups({ dates }: { dates: ResolvedUpcomingDate[] }) {
  const nonEmptyGroups = GROUPS.filter((g) => dates.some((d) => d.bucket === g.bucket));

  if (nonEmptyGroups.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {nonEmptyGroups.map((group) => (
        <div key={group.bucket}>
          <h2 className="text-ink-muted text-xs font-semibold uppercase tracking-wide">
            {group.title}
          </h2>
          <ul className="border-border divide-border mt-2 divide-y rounded-lg border">
            {dates
              .filter((d) => d.bucket === group.bucket)
              .map((d) => (
                <li key={d.date.id} className="p-3">
                  <Link href={`/people/${d.date.personId}`} className="flex items-center justify-between gap-4">
                    <span className="text-ink text-sm font-medium">
                      {d.date.label} — {d.personFirstName}
                    </span>
                    <span className="text-ink-muted shrink-0 text-xs">
                      {d.daysUntil === 0 ? "Today" : `${d.daysUntil}d`}
                      {d.age !== null ? ` · ${d.age}` : ""}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
