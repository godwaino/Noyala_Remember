import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Calendar</h1>
      <div className="mt-4">
        <EmptyState
          title="No upcoming dates yet"
          description="Once you add people and dates, this view groups them into Today, Next 7 Days, Next 30 Days and Later."
        />
      </div>
    </div>
  );
}
