import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/server/supabase/server-client";
import { listUpcomingDatesForUser } from "@/server/important-dates/queries";
import { resolveUpcomingDates } from "@/server/important-dates/upcoming";
import { UpcomingDateGroups } from "@/components/UpcomingDateGroups";
import { EmptyState } from "@/components/EmptyState";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const upcoming = await listUpcomingDatesForUser(supabase);
  const resolved = resolveUpcomingDates(upcoming, new Date());

  return (
    <div>
      <h1 className="text-xl font-semibold">Calendar</h1>
      <div className="mt-4">
        {resolved.length === 0 ? (
          <EmptyState
            title="No upcoming dates yet"
            description="Add a person and a birthday, anniversary or custom date to see it grouped here."
          />
        ) : (
          <UpcomingDateGroups dates={resolved} />
        )}
      </div>
    </div>
  );
}
