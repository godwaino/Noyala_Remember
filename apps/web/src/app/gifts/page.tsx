import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Gifts" };

export default function GiftsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Gifts</h1>
      <div className="mt-4">
        <EmptyState
          title="No gift ideas yet"
          description="Gift planning, budgets and history arrive in the Shared Circles and Gifting build stage."
        />
      </div>
    </div>
  );
}
