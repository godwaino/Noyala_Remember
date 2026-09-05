import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  calendarDateInTimeZone,
  daysBetween,
  nextOccurrence,
  ageAtOccurrence,
} from "@noyala/domain";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { getPerson } from "@/server/people/queries";
import { archivePerson, deletePerson, restorePerson } from "@/server/people/actions";
import { listImportantDatesForPerson } from "@/server/important-dates/queries";
import { deleteImportantDate } from "@/server/important-dates/actions";
import { listMemoriesForPerson } from "@/server/memories/queries";
import { archiveMemory } from "@/server/memories/actions";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";

export const metadata: Metadata = { title: "Person" };

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = await params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const person = await getPerson(supabase, personId);
  if (!person) notFound();

  const [dates, memories] = await Promise.all([
    listImportantDatesForPerson(supabase, personId),
    listMemoriesForPerson(supabase, personId),
  ]);

  const now = new Date();
  const resolvedDates = dates.map((date) => {
    const today = calendarDateInTimeZone(now, date.timezone);
    const occurrence = nextOccurrence(
      { month: date.month, day: date.day, year: date.year, recursAnnually: date.recursAnnually },
      today,
    );
    return {
      date,
      occurrence,
      daysUntil: occurrence ? daysBetween(today, occurrence) : null,
      age: occurrence ? ageAtOccurrence(date.year, occurrence) : null,
    };
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">
            {person.firstName} {person.lastName ?? ""}
            {person.nickname ? (
              <span className="text-ink-muted font-normal"> &ldquo;{person.nickname}&rdquo;</span>
            ) : null}
          </h1>
          <p className="text-ink-muted text-sm capitalize">
            {person.relationshipType}
            {person.pronouns ? ` · ${person.pronouns}` : ""}
            {person.archivedAt ? " · archived" : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/people/${person.id}/edit`}
            className="border-border rounded-md border px-3 py-1.5 text-sm font-medium"
          >
            Edit
          </Link>
          <form action={(person.archivedAt ? restorePerson : archivePerson).bind(null, person.id)}>
            <button
              type="submit"
              className="border-border rounded-md border px-3 py-1.5 text-sm font-medium"
            >
              {person.archivedAt ? "Restore" : "Archive"}
            </button>
          </form>
        </div>
      </div>

      {(person.phone || person.email) && (
        <p className="text-ink-muted mt-2 text-sm">
          {[person.phone, person.email].filter(Boolean).join(" · ")}
        </p>
      )}
      {person.notes ? <p className="text-ink mt-3 text-sm">{person.notes}</p> : null}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-ink font-semibold">Important dates</h2>
          <Link href={`/people/${person.id}/dates/new`} className="text-primary text-sm">
            Add date
          </Link>
        </div>
        <div className="mt-3">
          {resolvedDates.length === 0 ? (
            <EmptyState title="No dates yet" description="Add a birthday or anniversary." />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {resolvedDates.map(({ date, daysUntil, age }) => (
                <li key={date.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-ink font-medium">{date.label}</p>
                    <p className="text-ink-muted text-sm">
                      {date.month}/{date.day}
                      {date.year ? `/${date.year}` : ""}
                      {daysUntil !== null
                        ? ` · ${daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`}`
                        : " · already happened"}
                      {age !== null ? ` · turning ${age}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/people/${person.id}/dates/${date.id}/edit`}
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Edit
                    </Link>
                    <form action={deleteImportantDate.bind(null, person.id, date.id)}>
                      <ConfirmSubmitButton
                        confirmMessage={`Delete "${date.label}"?`}
                        className="border-border text-danger rounded-md border px-3 py-1.5 text-xs font-medium"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-ink font-semibold">Memories</h2>
          <Link href={`/people/${person.id}/memories/new`} className="text-primary text-sm">
            Add memory
          </Link>
        </div>
        <div className="mt-3">
          {memories.length === 0 ? (
            <EmptyState
              title="No memories yet"
              description="Save small details you'd want to remember later."
            />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {memories.map((memory) => (
                <li key={memory.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-ink text-sm">{memory.content}</p>
                    <p className="text-ink-muted mt-1 text-xs capitalize">
                      {memory.category}
                      {memory.sensitivity === "sensitive" ? " · sensitive" : ""}
                      {memory.occurredOn ? ` · ${memory.occurredOn}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/people/${person.id}/memories/${memory.id}/edit`}
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Edit
                    </Link>
                    <form action={archiveMemory.bind(null, person.id, memory.id)}>
                      <button
                        type="submit"
                        className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                      >
                        Archive
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="border-border mt-10 border-t pt-6">
        <form action={deletePerson.bind(null, person.id)}>
          <ConfirmSubmitButton
            confirmMessage={`Permanently delete ${person.firstName}? This also deletes their dates, memories and message history. This can't be undone.`}
            className="text-danger text-sm underline"
          >
            Delete {person.firstName} permanently
          </ConfirmSubmitButton>
        </form>
      </section>
    </div>
  );
}
