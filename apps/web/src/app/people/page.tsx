import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RELATIONSHIP_TYPE_OPTIONS, type RelationshipType } from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listPeople } from "@/server/people/queries";
import { archivePerson, restorePerson } from "@/server/people/actions";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "People" };

interface PeoplePageProps {
  searchParams: Promise<{ q?: string; relationship?: string; archived?: string }>;
}

export default async function PeoplePage({ searchParams }: PeoplePageProps) {
  const { q, relationship, archived } = await searchParams;

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const relationshipType = RELATIONSHIP_TYPE_OPTIONS.some((o) => o.value === relationship)
    ? (relationship as RelationshipType)
    : undefined;
  const includeArchived = archived === "1";

  const people = await listPeople(supabase, user.id, { search: q, relationshipType, includeArchived });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">People</h1>
        <div className="flex gap-2">
          <Link
            href="/people/import"
            className="border-border rounded-md border px-4 py-2 text-sm font-medium"
          >
            Import
          </Link>
          <Link
            href="/people/new"
            className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium"
          >
            Add person
          </Link>
        </div>
      </div>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-ink-muted text-xs">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Name or nickname"
            className="border-border rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="relationship" className="text-ink-muted text-xs">
            Relationship
          </label>
          <select
            id="relationship"
            name="relationship"
            defaultValue={relationship ?? ""}
            className="border-border rounded-md border px-3 py-2 text-sm"
          >
            <option value="">All</option>
            {RELATIONSHIP_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={includeArchived} />
          Show archived
        </label>
        <button
          type="submit"
          className="border-border rounded-md border px-3 py-2 text-sm font-medium"
        >
          Apply
        </button>
      </form>

      <div className="mt-6">
        {people.length === 0 ? (
          <EmptyState
            title={q || relationshipType ? "No matches" : "No people yet"}
            description={
              q || relationshipType
                ? "Try a different search or clear the filters."
                : "Add the first person you'd like to remember important things about."
            }
          />
        ) : (
          <ul className="border-border divide-border divide-y rounded-lg border">
            {people.map((person) => (
              <li key={person.id} className="flex items-center justify-between gap-4 p-4">
                <Link href={`/people/${person.id}`} className="min-w-0 flex-1">
                  <p className="text-ink truncate font-medium">
                    {person.firstName} {person.lastName ?? ""}
                    {person.archivedAt ? (
                      <span className="text-ink-muted ml-2 text-xs">(archived)</span>
                    ) : null}
                  </p>
                  <p className="text-ink-muted text-sm capitalize">{person.relationshipType}</p>
                </Link>
                <form action={(person.archivedAt ? restorePerson : archivePerson).bind(null, person.id)}>
                  <button
                    type="submit"
                    aria-label={`${person.archivedAt ? "Restore" : "Archive"} ${person.firstName}`}
                    className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                  >
                    {person.archivedAt ? "Restore" : "Archive"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
