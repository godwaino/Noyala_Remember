import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { brand } from "@noyala/brand";
import { bucketFollowUp, sortFollowUpsForDisplay } from "@noyala/domain";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { listUpcomingDatesForUser } from "@/server/important-dates/queries";
import { resolveUpcomingDates } from "@/server/important-dates/upcoming";
import { UpcomingDateGroups } from "@/components/UpcomingDateGroups";
import { listReconnectSuggestions } from "@/server/relationship-care/queries";
import { listOpenFollowUpsForUser } from "@/server/follow-ups/queries";
import { snoozeReconnect } from "@/server/people/actions";
import { completeFollowUp, dismissFollowUp } from "@/server/follow-ups/actions";

export default async function HomePage() {
  let user;
  let supabase;
  try {
    supabase = await getSupabaseServerClient();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    unstable_rethrow(error);
    reportError(error, { page: "home" });
    return (
      <EmptyState
        title="Sign-in isn't configured yet"
        description="This environment doesn't have a Supabase project connected. See docs/roadmap.md for the setup steps."
      />
    );
  }

  if (!user) {
    return (
      <div>
        <h1 className="text-xl font-semibold">{brand.tagline}</h1>
        <p className="text-ink-muted mt-2 text-sm">{brand.positioning}</p>
        <Link
          href="/login"
          className="bg-primary text-surface mt-6 inline-block rounded-md px-4 py-2 text-sm font-medium"
        >
          Sign in to get started
        </Link>
      </div>
    );
  }

  const now = new Date();
  const [upcoming, reconnectSuggestions, openFollowUps] = await Promise.all([
    listUpcomingDatesForUser(supabase),
    listReconnectSuggestions(supabase, now),
    listOpenFollowUpsForUser(supabase),
  ]);
  const resolved = resolveUpcomingDates(upcoming, now);
  const next = resolved[0];
  const sortedFollowUps = sortFollowUpsForDisplay(
    openFollowUps.map((f) => ({
      ...f,
      dueAt: f.followUp.dueAt ? new Date(f.followUp.dueAt) : null,
    })),
    now,
  ).filter((f) => bucketFollowUp(f.dueAt, now) !== "later");

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Home</h1>
        <Link
          href="/people/new"
          className="bg-primary text-surface rounded-md px-4 py-2 text-sm font-medium"
        >
          Add person
        </Link>
      </div>

      {next ? (
        <div className="border-border bg-surface mt-4 rounded-lg border p-4">
          <p className="text-ink-muted text-xs uppercase tracking-wide">Next up</p>
          <p className="text-ink mt-1 font-medium">
            {next.date.label} for {next.personFirstName}
          </p>
          <p className="text-ink-muted text-sm">
            {next.daysUntil === 0
              ? "Today"
              : `In ${next.daysUntil} day${next.daysUntil === 1 ? "" : "s"}`}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState
            title="No upcoming dates yet"
            description="Add a person and their birthday to see it here."
          />
        </div>
      )}

      {reconnectSuggestions.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-ink font-semibold">Reconnect</h2>
          <p className="text-ink-muted mt-1 text-sm">
            People you asked to hear about — never a score, just a plain reminder.
          </p>
          <ul className="border-border divide-border mt-3 divide-y rounded-lg border">
            {reconnectSuggestions.map(({ person, daysSinceLastInteraction }) => (
              <li key={person.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <Link href={`/people/${person.id}`} className="text-ink text-sm font-medium hover:underline">
                    {person.firstName}
                  </Link>
                  <p className="text-ink-muted text-xs">
                    {daysSinceLastInteraction === null
                      ? "No interaction logged yet"
                      : `Last contact ${daysSinceLastInteraction} day${daysSinceLastInteraction === 1 ? "" : "s"} ago`}
                    {" · "}
                    every {person.reconnectCadenceDays} days
                  </p>
                </div>
                <form action={snoozeReconnect.bind(null, person.id, 14)}>
                  <button
                    type="submit"
                    className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                  >
                    Snooze 2 weeks
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {sortedFollowUps.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-ink font-semibold">Follow-ups due</h2>
          <ul className="border-border divide-border mt-3 divide-y rounded-lg border">
            {sortedFollowUps.map(({ followUp, personFirstName }) => (
              <li key={followUp.id} className="flex items-center justify-between gap-4 p-4">
                <div>
                  <p className="text-ink text-sm">{followUp.description}</p>
                  <p className="text-ink-muted text-xs">
                    <Link href={`/people/${followUp.personId}`} className="hover:underline">
                      {personFirstName}
                    </Link>
                    {followUp.dueAt
                      ? ` · due ${new Date(followUp.dueAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={completeFollowUp.bind(null, followUp.personId, followUp.id)}>
                    <button
                      type="submit"
                      className="border-border rounded-md border px-3 py-1.5 text-xs font-medium"
                    >
                      Done
                    </button>
                  </form>
                  <form action={dismissFollowUp.bind(null, followUp.personId, followUp.id)}>
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
        </section>
      ) : null}

      <div className="mt-6">
        <UpcomingDateGroups dates={resolved} />
      </div>
    </div>
  );
}
