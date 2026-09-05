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
import { listRecentDraftBatchesForPerson } from "@/server/messages/queries";
import { listInteractionsForPerson } from "@/server/interactions/queries";
import { logInteraction, deleteInteraction } from "@/server/interactions/actions";
import { listOpenFollowUpsForPerson } from "@/server/follow-ups/queries";
import { createFollowUp, completeFollowUp, dismissFollowUp } from "@/server/follow-ups/actions";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { InteractionForm } from "@/components/InteractionForm";
import { FollowUpForm } from "@/components/FollowUpForm";
import { ConversationPrepCard } from "@/components/ConversationPrepCard";

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

  const [dates, memories, recentDraftBatches, interactions, followUps] = await Promise.all([
    listImportantDatesForPerson(supabase, personId),
    listMemoriesForPerson(supabase, personId),
    listRecentDraftBatchesForPerson(supabase, personId),
    listInteractionsForPerson(supabase, personId),
    listOpenFollowUpsForPerson(supabase, personId),
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

  const nextUpcomingDate = resolvedDates
    .filter((d): d is typeof d & { daysUntil: number } => d.daysUntil !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil)[0];

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
            href={`/people/${person.id}/drafts/new`}
            className="bg-primary text-surface rounded-md px-3 py-1.5 text-sm font-medium"
          >
            Write a message
          </Link>
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

      <ConversationPrepCard
        memories={memories}
        nextDate={
          nextUpcomingDate
            ? { label: nextUpcomingDate.date.label, daysUntil: nextUpcomingDate.daysUntil }
            : null
        }
      />

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

      <section className="mt-8">
        <h2 className="text-ink font-semibold">Follow-ups</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Private commitments — never scored, never shared.
        </p>
        <div className="mt-3">
          {followUps.length === 0 ? (
            <EmptyState title="No open follow-ups" description="Nothing you've promised is waiting." />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {followUps.map((followUp) => (
                <li key={followUp.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-ink text-sm">{followUp.description}</p>
                    {followUp.dueAt ? (
                      <p className="text-ink-muted text-xs">
                        Due {new Date(followUp.dueAt).toLocaleDateString()}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={completeFollowUp.bind(null, person.id, followUp.id)}>
                      <button
                        type="submit"
                        className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                      >
                        Done
                      </button>
                    </form>
                    <form action={dismissFollowUp.bind(null, person.id, followUp.id)}>
                      <button
                        type="submit"
                        className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                      >
                        Dismiss
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FollowUpForm action={createFollowUp.bind(null, person.id)} />
      </section>

      <section className="mt-8">
        <h2 className="text-ink font-semibold">Interactions</h2>
        <p className="text-ink-muted mt-1 text-sm">
          Calls, visits, messages and meetings you&apos;ve logged.
        </p>
        <div className="mt-3">
          {interactions.length === 0 ? (
            <EmptyState title="Nothing logged yet" description="Record a call, visit or message." />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {interactions.map((interaction) => (
                <li key={interaction.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-medium capitalize">
                      {interaction.type} · {new Date(interaction.occurredAt).toLocaleDateString()}
                    </p>
                    {interaction.summary ? (
                      <p className="text-ink-muted mt-1 text-sm">{interaction.summary}</p>
                    ) : null}
                  </div>
                  <form action={deleteInteraction.bind(null, person.id, interaction.id)}>
                    <button
                      type="submit"
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
        <InteractionForm action={logInteraction.bind(null, person.id)} />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-ink font-semibold">Recent messages</h2>
          <Link href={`/people/${person.id}/drafts/new`} className="text-primary text-sm">
            Write a message
          </Link>
        </div>
        <div className="mt-3">
          {recentDraftBatches.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Generate a message for a birthday, anniversary or just because."
            />
          ) : (
            <ul className="border-border divide-border divide-y rounded-lg border">
              {recentDraftBatches.map((batch) => (
                <li key={batch.batchId} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-ink text-sm font-medium">{batch.occasion}</p>
                    <p className="text-ink-muted text-xs capitalize">
                      {batch.tone.replace(/_/g, " ")} · {batch.channel} ·{" "}
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/people/${person.id}/drafts/${batch.batchId}`}
                    className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                  >
                    View
                  </Link>
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
