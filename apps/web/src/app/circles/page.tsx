import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Circles" };

export default function CirclesPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Circles</h1>
      <div className="mt-4">
        <EmptyState
          title="No shared circles yet"
          description="Inviting family or a partner to coordinate dates and gifts arrives in the Shared Circles and Gifting build stage."
        />
      </div>
    </div>
  );
}
