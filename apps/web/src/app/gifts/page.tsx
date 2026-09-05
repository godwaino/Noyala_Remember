import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listMyVisibleGiftIdeas } from "@/server/gift-ideas/queries";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Gifts" };

export default async function GiftsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ideas = await listMyVisibleGiftIdeas(supabase);

  const personIds = [...new Set(ideas.map((i) => i.personId))];
  const { data: people } = personIds.length
    ? await supabase.from("people").select("id, first_name, last_name").in("id", personIds)
    : { data: [] as { id: string; first_name: string; last_name: string | null }[] };
  const personNameById = new Map(
    (people ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name ?? ""}`.trim()]),
  );

  return (
    <div>
      <h1 className="text-xl font-semibold">Gifts</h1>
      <p className="text-ink-muted mt-1 text-sm">
        Ideas from every circle you&apos;re in. Add or update one from the person&apos;s own page —
        surprise gifts about you are never shown here.
      </p>
      <div className="mt-6">
        {ideas.length === 0 ? (
          <EmptyState
            title="No gift ideas yet"
            description="Share a person with a circle (gift planning on) to start collecting ideas."
          />
        ) : (
          <ul className="border-border divide-border divide-y rounded-lg border">
            {ideas.map((idea) => (
              <li key={idea.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium">{idea.title}</p>
                  <p className="text-ink-muted mt-1 text-xs">
                    For {personNameById.get(idea.personId) ?? "someone"} ·{" "}
                    <span className="capitalize">{idea.status}</span>
                    {idea.occasion ? ` · ${idea.occasion}` : ""}
                  </p>
                </div>
                <Link
                  href={`/people/${idea.personId}`}
                  className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
