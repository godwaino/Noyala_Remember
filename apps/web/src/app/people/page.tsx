import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">People</h1>
      <div className="mt-4">
        <EmptyState
          title="No people yet"
          description="Adding people, birthdays and memories arrives in the Relationship Core build stage."
        />
      </div>
    </div>
  );
}
