import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Drafts" };

export default function DraftsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Drafts</h1>
      <div className="mt-4">
        <EmptyState
          title="Message Studio isn't available yet"
          description="Generating editable, reviewable message drafts arrives in the Communication Intelligence build stage."
        />
      </div>
    </div>
  );
}
