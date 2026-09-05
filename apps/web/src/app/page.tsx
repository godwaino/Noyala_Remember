import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { brand } from "@noyala/brand";
import { EmptyState } from "@/components/EmptyState";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { reportError } from "@/server/observability/error-monitoring";
import { listUpcomingDatesForUser } from "@/server/important-dates/queries";
import { resolveUpcomingDates } from "@/server/important-dates/upcoming";
import { UpcomingDateGroups } from "@/components/UpcomingDateGroups";

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

  const upcoming = await listUpcomingDatesForUser(supabase);
  const resolved = resolveUpcomingDates(upcoming, new Date());
  const next = resolved[0];

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

      <div className="mt-6">
        <UpcomingDateGroups dates={resolved} />
      </div>
    </div>
  );
}
